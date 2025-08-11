const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

console.log('🚀 Starting full server with email support...');

// Email configuration - AWS SES SMTP
let emailTransporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log('📧 Configuring AWS SES SMTP for email notifications...');
  
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 30000, // 30 seconds
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  console.log('✅ AWS SES SMTP configured successfully');
} else {
  console.log('⚠️ Email configuration missing - email functionality disabled');
  emailTransporter = null;
}

// Function to send test email
const sendTestEmail = async () => {
  if (!emailTransporter || !process.env.NOTIFICATION_EMAIL || !process.env.FROM_EMAIL) {
    throw new Error('Email not configured - missing SMTP settings or email addresses');
  }

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: process.env.NOTIFICATION_EMAIL,
    subject: '🧪 Test Email - NDB Bank Threat Response System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">🧪 Email Test Successful!</h2>
        <p>This is a test email from the Threat Response System.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Status:</strong> ✅ Email configuration is working correctly</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated test message from the NDB Bank Threat Response System.
        </p>
      </div>
    `
  };

  const result = await emailTransporter.sendMail(mailOptions);
  return result;
};

// Middleware
app.use(cors());
app.use(express.json());

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    if (!emailTransporter) {
      return res.status(400).json({ 
        success: false,
        error: 'Email not configured',
        details: 'SMTP transporter not initialized. Check environment variables.'
      });
    }
    
    // Test SMTP connection first
    console.log('🔌 Testing SMTP connection...');
    await emailTransporter.verify();
    console.log('✅ SMTP connection verified');
    
    // Send test email
    console.log('📧 Sending test email...');
    const result = await sendTestEmail();
    
    console.log('✅ Test email sent successfully:', result.messageId);
    
    return res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    
    let errorMessage = error.message;
    let troubleshooting = [];
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      errorMessage = 'Connection timeout - cannot reach SMTP server';
      troubleshooting = [
        'Check if SMTP host is correct and reachable',
        'Verify firewall/security group allows outbound connections',
        'Confirm SMTP port is correct (usually 587 or 465)'
      ];
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed - check SMTP credentials';
      troubleshooting = [
        'Verify SMTP username and password are correct',
        'Check if 2FA or app-specific passwords are required'
      ];
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: error.code,
      troubleshooting: troubleshooting
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Threat Response Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    email: !!emailTransporter
  });
});

// Serve static files
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Serve React app for all other routes
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

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📧 Email configured: ${!!emailTransporter}`);
  console.log(`🌐 API: http://localhost:${port}/api`);
});