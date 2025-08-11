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
  connectionTimeoutMillis: 120000,
});

// Test database connection
// Skip database connection test in development to avoid blocking server startup
if (config.nodeEnv === 'production') {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.stack);
    } else {
      console.log('✅ Connected to PostgreSQL database');
      release();
    }
  });
} else {
  console.log('⚠️ Skipping database connection test in development mode');
}

// Email configuration
let emailTransporter;

// AWS SES Configuration
let sesClient;

try {
  // Try to import AWS SES SDK
  const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
  
  sesClient = new SESClient({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey
    }
  });
  
  console.log('✅ AWS SES SDK configured');
  
  // Also configure SMTP as fallback
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
  
} catch (error) {
  console.log('⚠️ AWS SES SDK not available, using SMTP only');
  
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
    console.log('✅ SMTP email transporter configured');
  } else {
    console.log('❌ Email configuration incomplete');
    emailTransporter = null;
  }
}

// Function to send email notification
const sendRecordAddedEmail = async (recordType, recordData, addedBy) => {
  if (!config.email.notificationEmail || !config.email.fromEmail) {
    console.log('❌ Email addresses not configured - FROM_EMAIL:', config.email.fromEmail, 'NOTIFICATION_EMAIL:', config.email.notificationEmail);
    return;
  }

  try {
    // Try AWS SES SDK first
    if (sesClient) {
      console.log('📧 Sending email via AWS SES SDK...');
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      
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
    }
    
    // Fallback to SMTP
    if (!emailTransporter) {
      console.log('❌ No email transporter available - emailTransporter:', !!emailTransporter, 'sesClient:', !!sesClient);
      return;
    }
    
    console.log('📧 Sending email via SMTP...');
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
    
    console.log('✅ Email sent via SMTP:', result.messageId);
    return result;

  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Trust proxy
app.set('trust proxy', true);

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
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'NDB Bank Threat Response Server',
    status: 'running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    email: !!emailTransporter || !!sesClient,
    database: config.database.host
  });
});

// Test email endpoint
app.post('/api/test-email', authenticateToken, async (req, res) => {
  try {
    if (!emailTransporter && !sesClient) {
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
app.get('/api/edl/:category', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
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
app.get('/api/users', authenticateToken, async (req, res) => {
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

app.post('/api/users', authenticateToken, async (req, res) => {
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

app.put('/api/users/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
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

app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
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
app.get('/api/categories', authenticateToken, async (req, res) => {
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

app.post('/api/categories', authenticateToken, async (req, res) => {
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
app.get('/api/ip-entries', authenticateToken, async (req, res) => {
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

app.post('/api/ip-entries', authenticateToken, async (req, res) => {
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
    
    // Send email notification
    try {
      await sendRecordAddedEmail('IP Entry', {
        ip: ip,
        type: detectType(ip),
        category: categoryName,
        description: description || ''
      }, addedBy);
      console.log('✅ Email notification sent successfully');
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add IP entry error:', error);
    res.status(500).json({ error: 'Failed to add IP entry' });
  }
});

app.delete('/api/ip-entries/:id', authenticateToken, async (req, res) => {
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
app.get('/api/whitelist', authenticateToken, async (req, res) => {
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

app.post('/api/whitelist', authenticateToken, async (req, res) => {
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
    
    // Send email notification
    await sendRecordAddedEmail('Whitelist Entry', {
      ip: ip,
      type: detectType(ip),
      description: description || ''
    }, addedBy);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add to whitelist error:', error);
    res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

app.delete('/api/whitelist/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM whitelist WHERE id = $1', [id]);
    res.json({ message: 'Removed from whitelist successfully' });
  } catch (error) {
    console.error('Remove from whitelist error:', error);
    res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

// Serve static files
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.json({ 
      message: 'Server running - build the app with: npm run build',
      timestamp: new Date().toISOString()
    });
  });
}

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