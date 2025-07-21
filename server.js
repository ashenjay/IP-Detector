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
      query += ' WHERE c.id = $1';
      params.push(category);
    }
    
    query += ' ORDER BY ie.date_added DESC';
    
    const result = await pool.query(query, params);
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
    
    const result = await pool.query(`
      SELECT ie.ip 
      FROM ip_entries ie 
      JOIN categories c ON ie.category_id = c.id 
      WHERE (c.name = $1 OR c.id = $1)
      AND ie.ip NOT IN (SELECT ip FROM whitelist)
      ORDER BY ie.date_added DESC
    `, [categoryName]);
    
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