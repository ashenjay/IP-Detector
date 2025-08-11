import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting server...');
console.log('📁 __dirname:', __dirname);
console.log('📁 dist path:', path.join(__dirname, 'dist'));

// Database connection with increased timeout
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Email configuration - AWS SES SMTP
let emailTransporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // AWS SES SMTP Configuration
  console.log('📧 Configuring AWS SES SMTP for email notifications...');
  console.log('📧 SMTP Host:', process.env.SMTP_HOST);
  console.log('📧 SMTP Port:', process.env.SMTP_PORT || 587);
  console.log('📧 SMTP User:', process.env.SMTP_USER);
  console.log('📧 From Email:', process.env.FROM_EMAIL);
  console.log('📧 Notification Email:', process.env.NOTIFICATION_EMAIL);
  
  emailTransporter = nodemailer.createTransporter({
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Enable debug logging
    logger: true // Enable logging
  });
  console.log('✅ AWS SES SMTP configured successfully');
  
  // Test the connection
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection test failed:', error);
    } else {
      console.log('✅ SMTP connection test successful');
    }
  });
} else {
  console.log('⚠️ Missing email configuration:');
  console.log('   SMTP_HOST:', !!process.env.SMTP_HOST);
  console.log('   SMTP_USER:', !!process.env.SMTP_USER);
  console.log('   SMTP_PASS:', !!process.env.SMTP_PASS);
  console.log('   FROM_EMAIL:', !!process.env.FROM_EMAIL);
  console.log('   NOTIFICATION_EMAIL:', !!process.env.NOTIFICATION_EMAIL);
  emailTransporter = null;
}

// Function to send email notification
const sendRecordAddedEmail = async (recordType, recordData, addedBy) => {
  console.log('📧 sendRecordAddedEmail called with:', { recordType, recordData, addedBy });
  
  if (!emailTransporter || !process.env.NOTIFICATION_EMAIL || !process.env.FROM_EMAIL) {
    console.log('❌ Email not configured or missing required variables:');
    console.log('   emailTransporter:', !!emailTransporter);
    console.log('   NOTIFICATION_EMAIL:', !!process.env.NOTIFICATION_EMAIL);
    console.log('   FROM_EMAIL:', !!process.env.FROM_EMAIL);
    return;
  }

  try {
    console.log('📧 Preparing email notification...');
    const subject = `🚨 New ${recordType} Added - NDB Bank Threat Response System`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1e40af; margin: 0; font-size: 24px;">NDB Bank</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Threat Response System</p>
          </div>
          
          <h2 style="color: #dc3545; margin-bottom: 20px; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
            🚨 New ${recordType} Added
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Added by:</td>
                <td style="padding: 8px 0; color: #6c757d;">${addedBy}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">IP/Hostname:</td>
                <td style="padding: 8px 0; color: #6c757d; font-family: monospace; background-color: #e9ecef; padding: 4px 8px; border-radius: 3px;">${recordData.ip}</td>
              </tr>
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Type:</td>
                <td style="padding: 8px 0; color: #6c757d;">${recordData.type.toUpperCase()}</td>
              </tr>
              ${recordData.category ? `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Category:</td>
                <td style="padding: 8px 0; color: #6c757d;">${recordData.category}</td>
              </tr>
              ` : ''}
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Description:</td>
                <td style="padding: 8px 0; color: #6c757d;">${recordData.description || 'No description provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Date Added:</td>
                <td style="padding: 8px 0; color: #6c757d;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <strong>⚠️ Security Alert:</strong> This is an automated notification from the Threat Response System. 
            Please review this addition and take appropriate action if necessary.
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="font-size: 12px; color: #6c757d; text-align: center; margin: 0;">
            This is an automated message from the Threat Response System.<br>
            Generated on ${new Date().toISOString()}
          </p>
        </div>
      </div>
    `;

    console.log('📧 Sending email from:', process.env.FROM_EMAIL);
    console.log('📧 Sending email to:', process.env.NOTIFICATION_EMAIL);
    console.log('📧 Email subject:', subject);
    
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.NOTIFICATION_EMAIL,
      subject: subject,
      html: html
    });

    console.log('✅ Email notification sent successfully for new', recordType, 'record');
  } catch (error) {
    console.error('❌ Failed to send email notification:');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error response:', error.response);
    console.error('   Full error:', error);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Trust proxy (important for Nginx reverse proxy)
app.set('trust proxy', true);

// Basic health check route
app.get('/', (req, res) => {
  // Serve React app for root route
  console.log('Serving React app for root route');
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('📄 Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Abuse IP Detector Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    port: port,
    proxy: 'nginx'
  });
});

// ✅ PUBLIC EDL ENDPOINTS - NO AUTHENTICATION REQUIRED
app.get('/api/edl/:category', async (req, res) => {
  try {
    const categoryName = req.params.category;
    console.log('🌐 PUBLIC EDL request for category:', categoryName);
    
    const result = await pool.query(`
      SELECT ie.ip 
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id 
      WHERE (c.name = $1 OR c.id::text = $1)
      AND ie.ip NOT IN (SELECT ip FROM whitelist)
      ORDER BY ie.date_added DESC
    `, [categoryName]);
    
    console.log('📊 EDL query result:', result.rows.length, 'IPs found for', categoryName);
    const ips = result.rows.map(row => row.ip);
    
    // Set proper headers for plain text
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Return plain text - one IP per line
    const response = ips.length > 0 ? ips.join('\n') : '# No entries found';
    console.log('📤 Sending EDL response:', response.substring(0, 100) + '...');
    res.send(response);
  } catch (error) {
    console.error('❌ Get EDL feed error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('# Error: Failed to get EDL feed');
  }
});

// Debug endpoint to check database
app.get('/api/debug', async (req, res) => {
  try {
    // Check categories
    const categoriesResult = await pool.query('SELECT id, name, label FROM categories ORDER BY name');
    
    // Check IP entries with category info and added_by field
    const ipEntriesResult = await pool.query(`
      SELECT ie.id, ie.ip, ie.category_id, ie.added_by, ie.date_added,
             c.name as category_name, c.label as category_label
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id 
      ORDER BY ie.date_added DESC 
      LIMIT 10
    `);
    
    // Count by category
    const countByCategory = await pool.query(`
      SELECT c.id, c.name, c.label, COUNT(ie.id) as count
      FROM categories c
      LEFT JOIN ip_entries ie ON ie.category_id = c.id
      GROUP BY c.id, c.name, c.label
      ORDER BY c.name
    `);
    
    const totalIpCount = await pool.query('SELECT COUNT(*) as count FROM ip_entries');
    const whitelistResult = await pool.query('SELECT COUNT(*) as count FROM whitelist');
    
    // Check added_by field status
    const addedByStatus = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN added_by IS NOT NULL AND added_by != '' THEN 1 END) as entries_with_added_by,
        COUNT(CASE WHEN added_by IS NULL OR added_by = '' THEN 1 END) as entries_without_added_by
      FROM ip_entries
    `);
    
    res.json({
      database: 'connected',
      categories: categoriesResult.rows,
      sampleIpEntries: ipEntriesResult.rows,
      countByCategory: countByCategory.rows,
      totalIPs: parseInt(totalIpCount.rows[0].count),
      totalWhitelist: parseInt(whitelistResult.rows[0].count),
      addedByStatus: addedByStatus.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password: '***' });
    
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = true',
      [username]
    );
    
    console.log('Database query result:', result.rows.length, 'users found');
    
    if (result.rows.length === 0) {
      console.log('No user found with username:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    console.log('Found user:', { 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      is_active: user.is_active,
      must_change_password: user.must_change_password
    });
    
    // Simple password comparison (in production, use bcrypt)
    if (password !== user.password) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Password match successful');
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        assignedCategories: user.assigned_categories 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    console.log('JWT token generated successfully');
    
    const { password: _, ...userResponse } = user;
    
    // Check if user must change password
    if (user.must_change_password) {
      console.log('User must change password');
      return res.json({ 
        user: userResponse, 
        token,
        forcePasswordChange: true 
      });
    }
    
    console.log('Login successful for user:', username);
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Users
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
    
    console.log('Creating user with data:', { username: username.trim(), email: email.trim(), role });
    
    // Check if username already exists (case-insensitive)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('Username already exists:', username.trim());
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists (case-insensitive)
    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))',
      [email]
    );
    
    if (existingEmail.rows.length > 0) {
      console.log('Email already exists:', email.trim());
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role, assigned_categories, created_by, is_active, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [username.trim(), email.trim(), password, role, assignedCategories || [], req.user.username, true, true]
    );
    
    console.log('User created successfully:', result.rows[0].username);
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
    
    console.log('Updating user:', id, 'with data:', updates);
    
    // If updating username or email, check for duplicates (excluding current user)
    if (updates.username) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) AND id != $2',
        [updates.username, id]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }
    
    if (updates.email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id != $2',
        [updates.email, id]
      );
      
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
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
    
    console.log('User updated successfully');
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Delete user request for ID:', req.params.id);
    console.log('Request user role:', req.user.role);
    console.log('Request user ID:', req.user.userId);
    
    if (req.user.role !== 'superadmin') {
      console.log('Access denied: not superadmin');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (id === req.user.userId) {
      console.log('Cannot delete yourself');
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists first
    const userCheck = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      console.log('User not found:', id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userToDelete = userCheck.rows[0];
    console.log('Deleting user:', userToDelete.username);
    
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    console.log('Delete result - rows affected:', result.rowCount);
    
    if (result.rowCount === 0) {
      console.log('No rows deleted');
      return res.status(404).json({ error: 'User not found or already deleted' });
    }
    
    console.log('User deleted successfully:', userToDelete.username);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Add password change endpoint
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    console.log('Password change request for user ID:', id);
    console.log('Request user ID:', req.user.userId);
    console.log('New password provided:', !!newPassword);
    
    // Users can only change their own password, or superadmin can change any
    if (req.user.userId !== id && req.user.role !== 'superadmin') {
      console.log('Access denied: user can only change own password');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      console.log('Password validation failed:', { 
        hasPassword: !!newPassword, 
        length: newPassword ? newPassword.length : 0 
      });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    console.log('Updating password for user:', id);
    
    const result = await pool.query(
      'UPDATE users SET password = $1, must_change_password = false WHERE id = $2',
      [newPassword, id]
    );
    
    console.log('Password update result - rows affected:', result.rowCount);
    
    if (result.rowCount === 0) {
      console.log('No user found with ID:', id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Password changed successfully for user:', id);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Categories
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
    
    console.log('Creating category with data:', { name: name.trim(), label: label.trim(), description: description.trim() });
    
    // Check if name already exists (case-insensitive, trimmed)
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))',
      [name]
    );
    
    if (existingCategory.rows.length > 0) {
      console.log('Category name already exists:', name.trim());
      return res.status(400).json({ error: 'Category name already exists' });
    }
    
    // First check what columns exist in the categories table
    const tableInfo = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      ORDER BY ordinal_position
    `);
    console.log('Available columns in categories table:', tableInfo.rows.map(r => r.column_name));
    
    const result = await pool.query(
      'INSERT INTO categories (name, label, description, color, icon, is_default, is_active, created_by, expiration_hours, auto_cleanup) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name.trim().toLowerCase(), label.trim(), description.trim(), color || 'bg-blue-500', icon || 'Shield', false, true, req.user.username, null, false]
    );
    
    console.log('Category created successfully:', result.rows[0].name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Updating category:', id, 'with data:', updates);
    
    // If updating name, check for duplicates (excluding current category)
    if (updates.name) {
      const existingCategory = await pool.query(
        'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2',
        [updates.name, id]
      );
      
      if (existingCategory.rows.length > 0) {
        return res.status(400).json({ error: 'Category name already exists' });
      }
    }
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (key !== 'id') {
        const dbKey = key === 'isActive' ? 'is_active' : 
                     key === 'isDefault' ? 'is_default' : 
                     key === 'createdBy' ? 'created_by' : key;
        updateFields.push(`${dbKey} = $${paramCount}`);
        updateValues.push(typeof updates[key] === 'string' ? updates[key].trim() : updates[key]);
        paramCount++;
      }
    });
    
    updateValues.push(id);
    
    await pool.query(
      `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      updateValues
    );
    
    console.log('Category updated successfully');
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Delete category request for ID:', req.params.id);
    console.log('Request user role:', req.user.role);
    console.log('Query params:', req.query);
    
    if (req.user.role !== 'superadmin') {
      console.log('Access denied: not superadmin');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const { migrateTo } = req.query;
    
    console.log('Deleting category:', id, 'migrateTo:', migrateTo);
    
    // Check if category exists and if it's a default category
    const categoryCheck = await pool.query('SELECT id, name, is_default FROM categories WHERE id = $1', [id]);
    if (categoryCheck.rows.length === 0) {
      console.log('Category not found:', id);
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const categoryToDelete = categoryCheck.rows[0];
    console.log('Category to delete:', categoryToDelete);
    
    // Prevent deleting default categories
    if (categoryToDelete.is_default) {
      console.log('Cannot delete default category:', categoryToDelete.name);
      return res.status(400).json({ error: 'Cannot delete default categories' });
    }
    
    // Check how many IP entries are in this category
    const ipCountResult = await pool.query('SELECT COUNT(*) as count FROM ip_entries WHERE category_id = $1', [id]);
    const ipCount = parseInt(ipCountResult.rows[0].count);
    console.log('IP entries in category:', ipCount);
    
    // If migration target is specified, migrate IP entries
    if (migrateTo && ipCount > 0) {
      console.log('Migrating', ipCount, 'IP entries to category:', migrateTo);
      
      // Verify migration target exists
      const targetCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [migrateTo]);
      if (targetCheck.rows.length === 0) {
        console.log('Migration target category not found:', migrateTo);
        return res.status(400).json({ error: 'Migration target category not found' });
      }
      
      const migrateResult = await pool.query(
        'UPDATE ip_entries SET category_id = $1 WHERE category_id = $2',
        [migrateTo, id]
      );
      console.log('Migrated IP entries:', migrateResult.rowCount);
    } else if (ipCount > 0) {
      // Delete all IP entries in this category
      console.log('Deleting', ipCount, 'IP entries in category:', id);
      const deleteIpsResult = await pool.query('DELETE FROM ip_entries WHERE category_id = $1', [id]);
      console.log('Deleted IP entries:', deleteIpsResult.rowCount);
    }
    
    // Delete the category
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    console.log('Delete category result - rows affected:', result.rowCount);
    
    if (result.rowCount === 0) {
      console.log('No category deleted');
      return res.status(404).json({ error: 'Category not found or already deleted' });
    }
    
    console.log('Category deleted successfully:', categoryToDelete.name);
    res.json({ 
      message: 'Category deleted successfully',
      migratedIPs: migrateTo ? ipCount : 0,
      deletedIPs: migrateTo ? 0 : ipCount
    });
  } catch (error) {
    console.error('Delete category error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to delete category: ' + error.message });
  }
});

// IP Entries
app.post('/api/ip-entries', authenticateToken, async (req, res) => {
  try {
    const { ip, category, description } = req.body;
    const addedBy = req.user.username;
    
    if (!ip || !category) {
      return res.status(400).json({ error: 'IP and category are required' });
    }
    
    console.log('Adding IP entry:', { ip, category, description, addedBy });
    
    // Check if IP is whitelisted
    const whitelistCheck = await pool.query('SELECT id FROM whitelist WHERE ip = $1', [ip]);
    if (whitelistCheck.rows.length > 0) {
      console.log('IP is whitelisted:', ip);
      return res.status(400).json({ error: 'IP is whitelisted and cannot be added to threat categories' });
    }
    
    // Check if IP already exists in any category
    const existingCheck = await pool.query('SELECT id FROM ip_entries WHERE ip = $1', [ip]);
    if (existingCheck.rows.length > 0) {
      console.log('IP already exists:', ip);
      return res.status(400).json({ error: 'IP already exists in the system' });
    }
    
    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id::text = $1 OR name = $1', [category]);
    if (categoryCheck.rows.length === 0) {
      console.log('Category not found:', category);
      return res.status(400).json({ error: 'Category does not exist' });
    }
    
    const categoryId = categoryCheck.rows[0].id;
    console.log('Using category ID:', categoryId);
    
    // Detect entry type
    const detectType = (entry) => {
      // Helper function to check if it's an IPv4 address
      const isIPv4 = (str) => {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
        return ipv4Regex.test(str);
      };
      
      // Helper function to check if it's an IPv6 address
      const isIPv6 = (str) => {
        // Remove CIDR notation for validation
        const [ipPart] = str.split('/');
        
        // Check for various IPv6 formats
        const ipv6Patterns = [
          // Full IPv6 (8 groups of 4 hex digits)
          /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
          // IPv6 with :: compression
          /^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/,
          // IPv6 starting with ::
          /^::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/,
          // IPv6 ending with ::
          /^([0-9a-fA-F]{1,4}:)+::$/,
          // Just ::
          /^::$/,
          // IPv6 loopback
          /^::1$/,
          // IPv6 with embedded IPv4
          /^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
          // Link-local with zone ID
          /^fe80:([0-9a-fA-F]{0,4}:){0,4}[0-9a-fA-F]{0,4}%[0-9a-zA-Z]+$/
        ];
        
        // Test against all patterns
        for (const pattern of ipv6Patterns) {
          if (pattern.test(ipPart)) {
            return true;
          }
        }
        
        // Additional check for compressed IPv6 with CIDR
        if (str.includes('/')) {
          const cidrRegex = /^([0-9a-fA-F]*:+[0-9a-fA-F]*)+\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/;
          if (cidrRegex.test(str)) {
            return true;
          }
        }
        
        return false;
      };
      
      // Check if it's an IP address (IPv4 or IPv6)
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
    
    console.log('✅ IP entry created successfully:', {
      id: result.rows[0].id,
      ip: result.rows[0].ip,
      added_by: result.rows[0].added_by,
      date_added: result.rows[0].date_added
    });
    
    // Send email notification
    await sendRecordAddedEmail('IP Entry', {
      ip: ip,
      type: detectType(ip),
      category: categoryName,
      description: description || ''
    }, addedBy);
    
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
app.post('/api/whitelist', authenticateToken, async (req, res) => {
  try {
    const { ip, description } = req.body;
    const addedBy = req.user.username;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP is required' });
    }
    
    // Check if IP already exists in whitelist
    const existingCheck = await pool.query('SELECT id FROM whitelist WHERE ip = $1', [ip]);
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP already in whitelist' });
    }
    
    // Detect entry type
    const detectType = (entry) => {
      // Helper function to check if it's an IPv4 address
      const isIPv4 = (str) => {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
        return ipv4Regex.test(str);
      };
      
      // Helper function to check if it's an IPv6 address
      const isIPv6 = (str) => {
        // Remove CIDR notation for validation
        const [ipPart] = str.split('/');
        
        // Check for various IPv6 formats
        const ipv6Patterns = [
          // Full IPv6 (8 groups of 4 hex digits)
          /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
          // IPv6 with :: compression
          /^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/,
          // IPv6 starting with ::
          /^::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/,
          // IPv6 ending with ::
          /^([0-9a-fA-F]{1,4}:)+::$/,
          // Just ::
          /^::$/,
          // IPv6 loopback
          /^::1$/,
          // IPv6 with embedded IPv4
          /^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
          // Link-local with zone ID
          /^fe80:([0-9a-fA-F]{0,4}:){0,4}[0-9a-fA-F]{0,4}%[0-9a-zA-Z]+$/
        ];
        
        // Test against all patterns
        for (const pattern of ipv6Patterns) {
          if (pattern.test(ipPart)) {
            return true;
          }
        }
        
        // Additional check for compressed IPv6 with CIDR
        if (str.includes('/')) {
          const cidrRegex = /^([0-9a-fA-F]*:+[0-9a-fA-F]*)+\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$/;
          if (cidrRegex.test(str)) {
            return true;
          }
        }
        
        return false;
      };
      
      // Check if it's an IP address (IPv4 or IPv6)
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

app.get('/api/ip-entries', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    console.log('🔍 Fetching IP entries for category:', category);
    
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
    
    console.log('🔍 Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log('🔍 Found IP entries:', result.rows.length);
    
    // Debug: Log first few entries to see the actual database data
    if (result.rows.length > 0) {
      console.log('🔍 Sample database rows:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          ip: row.ip,
          added_by: row.added_by,
          added_by_type: typeof row.added_by,
          date_added: row.date_added
        });
      });
    }
    
    // Transform the data to match frontend expectations
    const transformedData = result.rows.map(row => {
      // CRITICAL FIX: Properly handle the added_by field - use actual database value
      const addedBy = row.added_by || 'Unknown';
      
      return {
        id: row.id,
        ip: row.ip,
        type: row.type,
        category: row.category_id,
        description: row.description,
        addedBy: addedBy,
        dateAdded: row.date_added ? new Date(row.date_added) : new Date(),
        lastModified: row.last_modified ? new Date(row.last_modified) : new Date(),
        source: row.source,
        sourceCategory: row.source_category,
        reputation: row.reputation,
        vtReputation: row.vt_reputation
      };
    });
    
    // Debug: Log transformed data
    if (transformedData.length > 0) {
      console.log('🔍 Sample transformed data:');
      transformedData.slice(0, 3).forEach((data, index) => {
        console.log(`Transformed ${index + 1}:`, {
          ip: data.ip,
          addedBy: data.addedBy,
          dateAdded: data.dateAdded
        });
      });
    }
    
    res.json(transformedData);
  } catch (error) {
    console.error('Get IP entries error:', error);
    res.status(500).json({ error: 'Failed to get IP entries' });
  }
});

// Whitelist
app.get('/api/whitelist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whitelist ORDER BY date_added DESC');
    
    console.log('🔍 Raw whitelist data from database:', result.rows.slice(0, 2));
    
    // Transform whitelist data to match frontend expectations
    const transformedData = result.rows.map(row => ({
      id: row.id,
      ip: row.ip,
      type: row.type,
      description: row.description,
      addedBy: row.added_by || 'Unknown',
      dateAdded: row.date_added
    }));
    
    console.log('🔍 Transformed whitelist data:', transformedData.slice(0, 2));
    
    res.json(transformedData);
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

// Serve static files from dist directory
console.log('📁 Serving static files from:', path.join(__dirname, 'dist'));
app.use(express.static(path.join(__dirname, 'dist')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  console.log('Serving React app for route:', req.path);
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('📄 Serving index.html from:', indexPath);
  
  // Check if index.html exists before serving
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    console.error('❌ index.html not found at:', indexPath);
    res.status(404).send(`
      <html>
        <body>
          <h1>Build Error</h1>
          <p>The application has not been built yet.</p>
          <p>Please run: <code>npm run build</code></p>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - BIND TO LOCALHOST ONLY for security
app.listen(port, '127.0.0.1', () => {
  console.log(`🚀 Server running on localhost:${port} (internal only)`);
  console.log(`🔒 External access via Nginx reverse proxy`);
  console.log(`📡 API: http://localhost:${port}/api`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 PUBLIC EDL endpoints available at: /api/edl/{category}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});