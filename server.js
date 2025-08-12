import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createTransport } from 'nodemailer';
import fs from 'fs';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Monthly Report Generation Function
const generateMonthlyReport = async (year, month, userId = null) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    let userFilter = '';
    let params = [startDate, endDate];
    
    if (userId) {
      userFilter = ' AND u.id = $3';
      params.push(userId);
    }
    
    // Get user activity summary
    const userActivityQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        COUNT(DISTINCT ie.id) as ip_entries_added,
        COUNT(DISTINCT w.id) as whitelist_entries_added,
        COUNT(DISTINCT ie.id) + COUNT(DISTINCT w.id) as total_entries_added,
        MIN(COALESCE(ie.date_added, w.date_added)) as first_activity,
        MAX(COALESCE(ie.date_added, w.date_added)) as last_activity
      FROM users u
      LEFT JOIN ip_entries ie ON u.username = ie.added_by 
        AND ie.date_added >= $1 AND ie.date_added <= $2
      LEFT JOIN whitelist w ON u.username = w.added_by 
        AND w.date_added >= $1 AND w.date_added <= $2
      WHERE u.is_active = true ${userFilter}
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY total_entries_added DESC, u.username
    `;
    
    const userActivity = await pool.query(userActivityQuery, params);
    
    // Get category breakdown
    const categoryBreakdownQuery = `
      SELECT 
        u.username,
        c.label as category_name,
        COUNT(ie.id) as entries_count
      FROM users u
      LEFT JOIN ip_entries ie ON u.username = ie.added_by 
        AND ie.date_added >= $1 AND ie.date_added <= $2
      LEFT JOIN categories c ON ie.category_id = c.id
      WHERE u.is_active = true ${userFilter}
        AND c.label IS NOT NULL
      GROUP BY u.username, c.label
      ORDER BY u.username, entries_count DESC
    `;
    
    const categoryBreakdown = await pool.query(categoryBreakdownQuery, params);
    
    // Get daily activity
    const dailyActivityQuery = `
      SELECT 
        DATE(COALESCE(ie.date_added, w.date_added)) as activity_date,
        u.username,
        COUNT(DISTINCT ie.id) as ip_entries,
        COUNT(DISTINCT w.id) as whitelist_entries,
        COUNT(DISTINCT ie.id) + COUNT(DISTINCT w.id) as total_entries
      FROM users u
      LEFT JOIN ip_entries ie ON u.username = ie.added_by 
        AND ie.date_added >= $1 AND ie.date_added <= $2
      LEFT JOIN whitelist w ON u.username = w.added_by 
        AND w.date_added >= $1 AND w.date_added <= $2
      WHERE u.is_active = true ${userFilter}
        AND (ie.date_added IS NOT NULL OR w.date_added IS NOT NULL)
      GROUP BY activity_date, u.username
      ORDER BY activity_date DESC, u.username
    `;
    
    const dailyActivity = await pool.query(dailyActivityQuery, params);
    
    return {
      period: {
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        startDate,
        endDate
      },
      userActivity: userActivity.rows,
      categoryBreakdown: categoryBreakdown.rows,
      dailyActivity: dailyActivity.rows,
      summary: {
        totalUsers: userActivity.rows.length,
        activeUsers: userActivity.rows.filter(u => u.total_entries_added > 0).length,
        totalEntries: userActivity.rows.reduce((sum, u) => sum + parseInt(u.total_entries_added), 0),
        totalIpEntries: userActivity.rows.reduce((sum, u) => sum + parseInt(u.ip_entries_added), 0),
        totalWhitelistEntries: userActivity.rows.reduce((sum, u) => sum + parseInt(u.whitelist_entries_added), 0)
      }
    };
  } catch (error) {
    console.error('Generate monthly report error:', error);
    throw error;
  }
};

// Send Monthly Report Email
const sendMonthlyReportEmail = async (reportData, recipientEmail) => {
  try {
    const { period, userActivity, summary } = reportData;
    
    const subject = `📊 Monthly Activity Report - ${period.monthName} ${period.year} - NDB Bank Threat Response`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e40af; text-align: center;">📊 Monthly Activity Report</h1>
        <h2 style="color: #374151; text-align: center;">${period.monthName} ${period.year}</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin-top: 0;">📈 Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Total Users:</td><td style="padding: 8px;">${summary.totalUsers}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Active Users:</td><td style="padding: 8px;">${summary.activeUsers}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Total Entries Added:</td><td style="padding: 8px;">${summary.totalEntries}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">IP Entries:</td><td style="padding: 8px;">${summary.totalIpEntries}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Whitelist Entries:</td><td style="padding: 8px;">${summary.totalWhitelistEntries}</td></tr>
          </table>
        </div>
        
        <div style="margin: 20px 0;">
          <h3 style="color: #1f2937;">👥 User Activity Details</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
            <thead style="background: #f9fafb;">
              <tr>
                <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db;">User</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db;">Role</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">IP Entries</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">Whitelist</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">Total</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db;">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              ${userActivity.map(user => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${user.username}</td>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${user.role}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #d1d5db;">${user.ip_entries_added}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #d1d5db;">${user.whitelist_entries_added}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #d1d5db; font-weight: bold;">${user.total_entries_added}</td>
                  <td style="padding: 8px; border: 1px solid #d1d5db;">${user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'No activity'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 30px;">
          Generated on ${new Date().toLocaleString()}<br>
          NDB Bank Threat Response System - Monthly Activity Report
        </p>
      </div>
    `;

    const command = new SendEmailCommand({
      Source: config.email.fromEmail,
      Destination: {
        ToAddresses: [recipientEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          }
        }
      }
    });

    const result = await sesClient.send(command);
    console.log('✅ Monthly report email sent:', result.MessageId);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send monthly report email:', error);
    throw error;
  }
};

// Load environment variables first
dotenv.config();

// Environment Configuration
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET
  },
  aws: {
    region: process.env.AWS_SES_REGION,
    endpoint: process.env.AWS_SES_ENDPOINT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  email: {
    fromEmail: process.env.FROM_EMAIL,
    notificationEmail: process.env.NOTIFICATION_EMAIL
  },
  apis: {
    abuseipdb: process.env.ABUSEIPDB_API_KEY,
    virustotal: process.env.VIRUSTOTAL_API_KEY
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = config.port;

console.log('🚀 Starting Threat Response Server...');
console.log('🌍 Environment:', config.nodeEnv);
console.log('🔌 Port:', port);
console.log('🗄️ Database Host:', config.database.host);
console.log('📧 Email Configuration:');
console.log('   FROM_EMAIL:', config.email.fromEmail);
console.log('   NOTIFICATION_EMAIL:', config.email.notificationEmail);
console.log('   AWS_REGION:', config.aws.region);
console.log('   AWS_ENDPOINT:', config.aws.endpoint);
console.log('   AWS_ACCESS_KEY_ID:', !!config.aws.accessKeyId);
console.log('   AWS_SECRET_ACCESS_KEY:', !!config.aws.secretAccessKey);

// Database connection
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.nodeEnv === 'production' ? { require: true, rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 300000,
});

// Test database connection
// Skip database connection test in development to avoid blocking server startup
if (config.nodeEnv === 'production' && config.database.host) {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.stack);
    } else {
      console.log('✅ Connected to PostgreSQL database');
      release();
    }
  });
} else {
  if (!config.database.host) {
    console.log('⚠️ No database host configured - running without database');
  } else {
    console.log('⚠️ Skipping database connection test in development mode');
  }
}

// Email configuration
let emailTransporter;

// AWS SES Client Configuration
const sesClient = new SESClient({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

console.log('✅ AWS SES SDK configured with custom endpoint');

// SMTP fallback configuration
if (config.aws.accessKeyId && config.aws.secretAccessKey) {
  emailTransporter = createTransport({
    host: `email-smtp.${config.aws.region}.amazonaws.com`,
    port: 587,
    secure: false,
    auth: {
      user: config.aws.accessKeyId,
      pass: config.aws.secretAccessKey
    }
  });
  console.log('✅ SMTP fallback configured');
} else {
  console.log('❌ Email configuration incomplete');
  emailTransporter = null;
}

// Function to send email notification
const sendRecordAddedEmail = async (recordType, recordData, addedBy) => {
  if (!config.email.notificationEmail || !config.email.fromEmail) {
    console.log('❌ Email addresses not configured - FROM_EMAIL:', config.email.fromEmail, 'NOTIFICATION_EMAIL:', config.email.notificationEmail);
    return;
  }

  try {
    // AWS SES SDK
    console.log('📧 Sending email via AWS SES SDK...');
    
    const subject = `🚨 New ${recordType} Added - NDB Bank Threat Response System`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">🚨 New ${recordType} Added</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold;">Added by:</td><td style="padding: 8px;">${addedBy}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">IP/Hostname:</td><td style="padding: 8px; font-family: monospace;">${recordData.ip}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${recordData.type.toUpperCase()}</td></tr>
          ${recordData.category ? `<tr><td style="padding: 8px; font-weight: bold;">Category:</td><td style="padding: 8px;">${recordData.category}</td></tr>` : ''}
          <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px;">${recordData.description || 'No description provided'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Date Added:</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
        </table>
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
          Automated message from NDB Bank Threat Response System
        </p>
      </div>
    `;

    const command = new SendEmailCommand({
      Source: config.email.fromEmail,
      Destination: {
        ToAddresses: [config.email.notificationEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8'
          }
        }
      }
    });

    const result = await sesClient.send(command);
    console.log('✅ Email sent via AWS SES SDK:', result.MessageId);
    return result;
    
  } catch (error) {
    console.error('❌ AWS SES failed, trying SMTP fallback:', error.message);
    
    // Fallback to SMTP
    if (!emailTransporter) {
      console.log('❌ No SMTP fallback available');
      throw error;
    }
    
    try {
      console.log('📧 Sending email via SMTP fallback...');
      const subject = `🚨 New ${recordType} Added - NDB Bank Threat Response System`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">🚨 New ${recordType} Added</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Added by:</td><td style="padding: 8px;">${addedBy}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">IP/Hostname:</td><td style="padding: 8px; font-family: monospace;">${recordData.ip}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${recordData.type.toUpperCase()}</td></tr>
            ${recordData.category ? `<tr><td style="padding: 8px; font-weight: bold;">Category:</td><td style="padding: 8px;">${recordData.category}</td></tr>` : ''}
            <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px;">${recordData.description || 'No description provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Date Added:</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
          </table>
          <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
            Automated message from NDB Bank Threat Response System
          </p>
        </div>
      `;

      const result = await emailTransporter.sendMail({
        from: config.email.fromEmail,
        to: config.email.notificationEmail,
        subject: subject,
        html: html
      });
      
      console.log('✅ Email sent via SMTP fallback:', result.messageId);
      return result;
      
    } catch (smtpError) {
      console.error('❌ SMTP fallback also failed:', smtpError.message);
      throw smtpError;
    }
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy
app.set('trust proxy', true);

// Create API Router
const apiRouter = express.Router();

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ 
    message: 'NDB Bank Threat Response Server',
    status: 'running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    email: !!sesClient || !!emailTransporter,
    database: config.database.host
  });
});

// Middleware to protect all API routes except public ones
apiRouter.use((req, res, next) => {
  // Public routes that don't require authentication
  const publicRoutes = [
    '/health',
    '/auth/login',
    '/edl/'
  ];
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return req.path.startsWith(route);
    }
    return req.path === route;
  });
  
  if (isPublicRoute) {
    return next();
  }
  
  // For all other API routes, require authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
});

// Test email endpoint
apiRouter.post('/test-email', async (req, res) => {
  try {
    if (!sesClient && !emailTransporter) {
      return res.status(400).json({ 
        success: false,
        error: 'Email not configured'
      });
    }
    
    await sendRecordAddedEmail('Test Entry', {
      ip: '192.168.1.100',
      type: 'ip',
      category: 'Test Category',
      description: 'This is a test email from the system'
    }, req.user.username);
    
    return res.json({
      success: true,
      message: 'Test email sent successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUBLIC EDL ENDPOINTS - NO AUTHENTICATION REQUIRED
apiRouter.get('/edl/:category', async (req, res) => {
  try {
    const categoryName = req.params.category;
    
    const result = await pool.query(`
      SELECT ie.ip 
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id 
      WHERE (c.name = $1 OR c.id::text = $1)
      AND ie.ip NOT IN (SELECT ip FROM whitelist)
      ORDER BY ie.date_added DESC
    `, [categoryName]);
    
    const ips = result.rows.map(row => row.ip);
    
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const response = ips.length > 0 ? ips.join('\n') : '# No entries found';
    res.send(response);
  } catch (error) {
    console.error('❌ Get EDL feed error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('# Error: Failed to get EDL feed');
  }
});

// Authentication
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = true',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        assignedCategories: user.assigned_categories 
      },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    
    const { password: _, ...userResponse } = user;
    
    if (user.must_change_password) {
      return res.json({ 
        user: userResponse, 
        token,
        forcePasswordChange: true 
      });
    }
    
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Users endpoints
apiRouter.get('/users', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await pool.query('SELECT id, username, email, role, assigned_categories, is_active, must_change_password, created_by, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

apiRouter.post('/users', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { username, email, role, assignedCategories, password } = req.body;
    
    if (!username || !email || !role || !password) {
      return res.status(400).json({ error: 'Username, email, role, and password are required' });
    }
    
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role, assigned_categories, created_by, is_active, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [username.trim(), email.trim(), password, role, assignedCategories || [], req.user.username, true, true]
    );
    
    const { password: _, ...userResponse } = result.rows[0];
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

apiRouter.put('/users/:id', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        const dbKey = key === 'isActive' ? 'is_active' : 
                     key === 'mustChangePassword' ? 'must_change_password' :
                     key === 'assignedCategories' ? 'assigned_categories' : key;
        updateFields.push(`${dbKey} = $${paramCount}`);
        updateValues.push(typeof updates[key] === 'string' ? updates[key].trim() : updates[key]);
        paramCount++;
      }
    });
    
    updateValues.push(id);
    
    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      updateValues
    );
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

apiRouter.delete('/users/:id', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

apiRouter.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (req.user.userId !== id && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const result = await pool.query(
      'UPDATE users SET password = $1, must_change_password = false WHERE id = $2',
      [newPassword, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Categories endpoints
apiRouter.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(ie.id) as ip_count
      FROM categories c
      LEFT JOIN ip_entries ie ON c.id = ie.category_id
      GROUP BY c.id, c.name, c.label, c.description, c.color, c.icon, c.is_default, c.is_active, c.created_by, c.created_at
      ORDER BY c.created_at
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

apiRouter.post('/categories', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, label, description, color, icon } = req.body;
    
    if (!name || !label || !description) {
      return res.status(400).json({ error: 'Name, label, and description are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO categories (name, label, description, color, icon, is_default, is_active, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name.trim().toLowerCase(), label.trim(), description.trim(), color || 'bg-blue-500', icon || 'Shield', false, true, req.user.username]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// IP Entries endpoints
apiRouter.get('/ip-entries', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT ie.*, c.name as category_name, c.label as category_label, c.id as category_id
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id
    `;
    let params = [];
    
    if (category) {
      query += ' WHERE (c.id::text = $1 OR c.name = $1)';
      params.push(category);
    }
    
    query += ' ORDER BY ie.date_added DESC';
    
    const result = await pool.query(query, params);
    
    const transformedData = result.rows.map(row => ({
      id: row.id,
      ip: row.ip,
      type: row.type,
      category: row.category_id,
      description: row.description,
      addedBy: row.added_by || 'Unknown',
      dateAdded: row.date_added ? new Date(row.date_added) : new Date(),
      lastModified: row.last_modified ? new Date(row.last_modified) : new Date(),
      source: row.source,
      sourceCategory: row.source_category,
      reputation: row.reputation,
      vtReputation: row.vt_reputation
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Get IP entries error:', error);
    res.status(500).json({ error: 'Failed to get IP entries' });
  }
});

apiRouter.post('/ip-entries', async (req, res) => {
  try {
    const { ip, category, description } = req.body;
    const addedBy = req.user.username;
    
    if (!ip || !category) {
      return res.status(400).json({ error: 'IP and category are required' });
    }
    
    // Check if IP is whitelisted
    const whitelistCheck = await pool.query('SELECT id FROM whitelist WHERE ip = $1', [ip]);
    if (whitelistCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP is whitelisted and cannot be added to threat categories' });
    }
    
    // Check if IP already exists
    const existingCheck = await pool.query('SELECT id FROM ip_entries WHERE ip = $1', [ip]);
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP already exists in the system' });
    }
    
    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id::text = $1 OR name = $1', [category]);
    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Category does not exist' });
    }
    
    const categoryId = categoryCheck.rows[0].id;
    
    // Detect entry type
    const detectType = (entry) => {
      const isIPv4 = (str) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/.test(str);
      const isIPv6 = (str) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(str.split('/')[0]);
      
      if (isIPv4(entry) || isIPv6(entry)) return 'ip';
      if (entry.includes('.') && entry.split('.').length >= 2) return 'fqdn';
      return 'hostname';
    };
    
    const result = await pool.query(
      'INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ip, detectType(ip), categoryId, description || '', addedBy, 'manual']
    );
    
    // Get category name for email notification
    const categoryResult = await pool.query('SELECT name, label FROM categories WHERE id = $1', [categoryId]);
    const categoryName = categoryResult.rows[0]?.label || 'Unknown Category';
    
    // Send email notification (non-blocking)
    sendRecordAddedEmail('IP Entry', {
      ip: ip,
      type: detectType(ip),
      category: categoryName,
      description: description || ''
    }, addedBy).then(() => {
      console.log('✅ Email notification sent successfully for IP:', ip);
    }).catch(emailError => {
      console.error('❌ Email notification failed for IP:', ip, 'Error:', emailError.message);
    });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add IP entry error:', error);
    res.status(500).json({ error: 'Failed to add IP entry' });
  }
});

apiRouter.delete('/ip-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM ip_entries WHERE id = $1', [id]);
    res.json({ message: 'IP entry deleted successfully' });
  } catch (error) {
    console.error('Delete IP entry error:', error);
    res.status(500).json({ error: 'Failed to delete IP entry' });
  }
});

// Whitelist endpoints
apiRouter.get('/whitelist', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whitelist ORDER BY date_added DESC');
    
    const transformedData = result.rows.map(row => ({
      id: row.id,
      ip: row.ip,
      type: row.type,
      description: row.description,
      addedBy: row.added_by || 'Unknown',
      dateAdded: row.date_added
    }));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

apiRouter.post('/whitelist', async (req, res) => {
  try {
    const { ip, description } = req.body;
    const addedBy = req.user.username;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP is required' });
    }
    
    const existingCheck = await pool.query('SELECT id FROM whitelist WHERE ip = $1', [ip]);
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP already in whitelist' });
    }
    
    const detectType = (entry) => {
      const isIPv4 = (str) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/.test(str);
      const isIPv6 = (str) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(str.split('/')[0]);
      
      if (isIPv4(entry) || isIPv6(entry)) return 'ip';
      if (entry.includes('.') && entry.split('.').length >= 2) return 'fqdn';
      return 'hostname';
    };
    
    const result = await pool.query(
      'INSERT INTO whitelist (ip, type, description, added_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [ip, detectType(ip), description || '', addedBy]
    );
    
    // Send email notification (non-blocking)
    sendRecordAddedEmail('Whitelist Entry', {
      ip: ip,
      type: detectType(ip),
      description: description || ''
    }, addedBy).then(() => {
      console.log('✅ Email notification sent successfully for whitelist IP:', ip);
    }).catch(emailError => {
      console.error('❌ Email notification failed for whitelist IP:', ip, 'Error:', emailError.message);
    });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add to whitelist error:', error);
    res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

apiRouter.delete('/whitelist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM whitelist WHERE id = $1', [id]);
    res.json({ message: 'Removed from whitelist successfully' });
  } catch (error) {
    console.error('Remove from whitelist error:', error);
    res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

// Monthly Reports endpoints
apiRouter.get('/reports/monthly', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { year, month, userId } = req.query;
    const currentDate = new Date();
    const reportYear = year ? parseInt(year) : currentDate.getFullYear();
    const reportMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    
    const report = await generateMonthlyReport(reportYear, reportMonth, userId);
    res.json(report);
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

apiRouter.post('/reports/monthly/send', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { year, month, userId, email } = req.body;
    const currentDate = new Date();
    const reportYear = year || currentDate.getFullYear();
    const reportMonth = month || currentDate.getMonth() + 1;
    const recipientEmail = email || config.email.notificationEmail;
    
    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }
    
    const report = await generateMonthlyReport(reportYear, reportMonth, userId);
    await sendMonthlyReportEmail(report, recipientEmail);
    
    res.json({ 
      message: 'Monthly report sent successfully',
      period: report.period,
      sentTo: recipientEmail
    });
  } catch (error) {
    console.error('Send monthly report error:', error);
    res.status(500).json({ error: 'Failed to send monthly report' });
  }
});

// Auto-generate monthly reports (can be called via cron job)
apiRouter.post('/reports/monthly/auto-generate', async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;
    
    // Generate report for all users
    const report = await generateMonthlyReport(year, month);
    
    // Send to notification email
    if (config.email.notificationEmail) {
      await sendMonthlyReportEmail(report, config.email.notificationEmail);
    }
    
    res.json({
      message: 'Auto-generated monthly report sent successfully',
      period: report.period,
      summary: report.summary
    });
  } catch (error) {
    console.error('Auto-generate monthly report error:', error);
    res.status(500).json({ error: 'Failed to auto-generate monthly report' });
  }
});

// Mount API router
app.use('/api', apiRouter);

// Serve static files
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Handle frontend routes - serve index.html for non-API routes
app.get('*', (req, res) => {
  
  // Serve React app for frontend routes
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ 
      message: 'Server running - build the app with: npm run build',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📧 Email configured: ${!!emailTransporter || !!sesClient}`);
  console.log(`🌐 API: http://localhost:${port}/api`);
  console.log(`🌐 PUBLIC EDL endpoints: /api/edl/{category}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});