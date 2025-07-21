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

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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
    port: port
  });
});

// Debug endpoint to check database
app.get('/api/debug', async (req, res) => {
  try {
    const categoriesResult = await pool.query('SELECT id, name, label FROM categories ORDER BY name');
    const ipEntriesResult = await pool.query('SELECT COUNT(*) as count FROM ip_entries');
    const whitelistResult = await pool.query('SELECT COUNT(*) as count FROM whitelist');
    
    res.json({
      database: 'connected',
      categories: categoriesResult.rows,
      totalIPs: parseInt(ipEntriesResult.rows[0].count),
      totalWhitelist: parseInt(whitelistResult.rows[0].count),
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
      is_active: user.is_active
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

// Categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY created_at');
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
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
      return res.status(400).json({ error: 'IP is whitelisted and cannot be added to threat categories' });
    }
    
    // Check if IP already exists in any category
    const existingCheck = await pool.query('SELECT id FROM ip_entries WHERE ip = $1', [ip]);
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP already exists in the system' });
    }
    
    // Verify category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1 OR name = $1', [category]);
    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Category does not exist' });
    }
    
    const categoryId = categoryCheck.rows[0].id;
    console.log('Using category ID:', categoryId);
    
    // Detect entry type
    const detectType = (entry) => {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      
      if (ipv4Regex.test(entry) || ipv6Regex.test(entry)) return 'ip';
      if (entry.includes('.') && entry.split('.').length >= 2) return 'fqdn';
      return 'hostname';
    };
    
    const result = await pool.query(
      'INSERT INTO ip_entries (ip, type, category_id, description, added_by, source) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ip, detectType(ip), categoryId, description || '', addedBy, 'manual']
    );
    
    console.log('IP entry created:', result.rows[0]);
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
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
      
      if (ipv4Regex.test(entry) || ipv6Regex.test(entry)) return 'ip';
      if (entry.includes('.') && entry.split('.').length >= 2) return 'fqdn';
      return 'hostname';
    };
    
    const result = await pool.query(
      'INSERT INTO whitelist (ip, type, description, added_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [ip, detectType(ip), description || '', addedBy]
    );
    
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
    console.log('Fetching IP entries for category:', category);
    
    let query = `
      SELECT ie.*, c.name as category_name, c.label as category_label, c.id as category_id
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id
    `;
    let params = [];
    
    if (category) {
      query += ' WHERE (c.id = $1 OR c.name = $1)';
      params.push(category);
    }
    
    query += ' ORDER BY ie.date_added DESC';
    
    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log('Found IP entries:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Get IP entries error:', error);
    res.status(500).json({ error: 'Failed to get IP entries' });
  }
});

// Whitelist
app.get('/api/whitelist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whitelist ORDER BY date_added DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get whitelist error:', error);
    res.status(500).json({ error: 'Failed to get whitelist' });
  }
});

// EDL Feed
app.get('/api/edl/:category', async (req, res) => {
  try {
    const categoryName = req.params.category;
    console.log('Fetching EDL for category:', categoryName);
    
    const result = await pool.query(`
      SELECT ie.ip 
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id 
      WHERE (c.name = $1 OR c.id = $1)
      AND ie.ip NOT IN (SELECT ip FROM whitelist)
      ORDER BY ie.date_added DESC
    `, [categoryName]);
    
    console.log('EDL query result:', result.rows.length, 'IPs found');
    const ips = result.rows.map(row => row.ip);
    
    res.set('Content-Type', 'text/plain');
    res.send(ips.join('\n'));
  } catch (error) {
    console.error('Get EDL feed error:', error);
    res.status(500).json({ error: 'Failed to get EDL feed' });
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
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌐 Application: http://localhost:${port}`);
  console.log(`📡 API: http://localhost:${port}/api`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});