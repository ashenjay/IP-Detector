const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Load environment variables first
require('dotenv').config();

console.log('🚀 Starting Threat Response Server...');
console.log('🔍 Environment Check:');
console.log('   AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('   AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('   FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('   NOTIFICATION_EMAIL:', process.env.NOTIFICATION_EMAIL);
console.log('   AWS_SES_REGION:', process.env.AWS_SES_REGION || 'ap-southeast-1');
console.log('   SMTP_HOST:', process.env.SMTP_HOST);
console.log('   SMTP_PORT:', process.env.SMTP_PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);

// Detect if we're in Bolt environment
const isBoltEnvironment = process.env.BOLT_ENV || process.cwd().includes('/home/project') || process.env.HOSTNAME?.includes('bolt');
console.log('🌐 Environment Detection:');
console.log('   Is Bolt Environment:', isBoltEnvironment);
console.log('   Current Working Directory:', process.cwd());
console.log('   Hostname:', process.env.HOSTNAME);

const app = express();
const port = process.env.PORT || 3001;

// Email configuration - AWS SES SMTP
let emailTransporter;
let sesClient = null;
let emailConfigured = false;

// Try to load AWS SES SDK
let SESClient, SendEmailCommand;
try {
  const awsSdk = require('@aws-sdk/client-ses');
  SESClient = awsSdk.SESClient;
  SendEmailCommand = awsSdk.SendEmailCommand;
  console.log('✅ AWS SES SDK loaded successfully');
  console.log('✅ AWS SES SDK loaded successfully');
} catch (error) {
  console.log('⚠️ AWS SES SDK not available:', error.message);
  SESClient = null;
  SendEmailCommand = null;
}

// Configure AWS SES if credentials are available
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.FROM_EMAIL && process.env.NOTIFICATION_EMAIL) {
  console.log('📧 Configuring email services...');
  // Configure AWS SES Client if SDK is available
  if (SESClient && SendEmailCommand) {
    try {
      sesClient = new SESClient({
        region: process.env.AWS_SES_REGION || 'ap-southeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      console.log('✅ AWS SES SDK client configured successfully');
      emailConfigured = true;
    } catch (error) {
      console.error('❌ Failed to configure AWS SES SDK client:', error.message);
      sesClient = null;
    }
  }
  
  // Also configure Nodemailer as backup
  try {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      auth: {
        user: process.env.AWS_ACCESS_KEY_ID,
        pass: process.env.AWS_SECRET_ACCESS_KEY
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Nodemailer SMTP transporter configured successfully');
    emailConfigured = true;
  } catch (error) {
    console.error('❌ Failed to configure Nodemailer transporter:', error.message);
    emailTransporter = null;
  }
  
  console.log('📧 Email configuration summary:');
  console.log('   SES SDK Client:', !!sesClient);
  console.log('   SMTP Transporter:', !!emailTransporter);
  emailTransporter = null;
  sesClient = null;
}

// Function to send test email
const sendTestEmailWithSES = async () => {
  if (!sesClient || !SendEmailCommand || !process.env.NOTIFICATION_EMAIL || !process.env.FROM_EMAIL) {
    throw new Error('AWS SES not configured - missing SDK, credentials, or email addresses');
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af;">🧪 Email Test Successful!</h2>
      <p>This is a test email from the NDB Bank Threat Response System.</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      <p><strong>Status:</strong> ✅ AWS SES configuration is working correctly</p>
      <p><strong>Region:</strong> ${process.env.AWS_SES_REGION || 'us-east-1'}</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        This is an automated test message from the NDB Bank Threat Response System.
      </p>
    </div>
  `;

  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: [process.env.NOTIFICATION_EMAIL]
    },
    Message: {
      Subject: {
        Data: '🧪 Test Email - NDB Bank Threat Response System',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: 'UTF-8'
        }
      }
    }
  };

  const command = new SendEmailCommand(params);
  const result = await sesClient.send(command);
  return result;
};

const sendTestEmail = async () => {
  if (!emailTransporter || !process.env.NOTIFICATION_EMAIL || !process.env.FROM_EMAIL) {
    throw new Error('Email not configured - missing SMTP settings or email addresses');
  }

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: process.env.NOTIFICATION_EMAIL,
    subject: '🧪 Test Email - NDB Bank Threat Response System',
    text: 'This is a test email from the NDB Bank Threat Response System.',
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

// Simple function to check if we can send emails
const canSendEmail = () => {
  if (isBoltEnvironment) return false;
  return emailConfigured && (sesClient || emailTransporter);
};

// Middleware
app.use(cors());
app.use(express.json());

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Check if we're in Bolt environment first
    if (isBoltEnvironment) {
      console.log('⚠️ Detected Bolt environment - email functionality limited');
      return res.status(400).json({
        success: false,
        error: 'Email functionality not available in Bolt environment',
        details: 'Bolt sandbox blocks outbound SMTP connections for security. Email will work when deployed to production server.',
        environment: 'bolt',
        canSendEmail: false
      });
    }
    
    // Log current configuration state
    console.log('🔍 Configuration Check:');
    console.log('   SES Client available:', !!sesClient);
    console.log('   SendEmailCommand available:', !!SendEmailCommand);
    console.log('   Email transporter available:', !!emailTransporter);
    console.log('   FROM_EMAIL:', process.env.FROM_EMAIL);
    console.log('   NOTIFICATION_EMAIL:', process.env.NOTIFICATION_EMAIL);
    console.log('   AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('   AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY);
    
    if (!canSendEmail()) {
      return res.status(400).json({ 
        success: false,
        error: 'Email not configured or not available',
        details: 'Email configuration incomplete or running in restricted environment.',
        debug: {
          sesClient: !!sesClient,
          emailTransporter: !!emailTransporter,
          fromEmail: !!process.env.FROM_EMAIL,
          notificationEmail: !!process.env.NOTIFICATION_EMAIL,
          awsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          awsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          sesSDKAvailable: !!SESClient,
          sendEmailCommandAvailable: !!SendEmailCommand,
          isBoltEnvironment: isBoltEnvironment
        }
      });
    }
    
    // Try AWS SES SDK first
    if (sesClient && SendEmailCommand) {
      try {
        console.log('📧 Sending test email via AWS SES SDK...');
        const result = await sendTestEmailWithSES();
        
        console.log('✅ Test email sent successfully via AWS SES SDK:', result.MessageId);
        
        return res.json({
          success: true,
          message: 'Test email sent successfully via AWS SES SDK',
          messageId: result.MessageId,
          method: 'AWS SES SDK',
          timestamp: new Date().toISOString()
        });
      } catch (sesError) {
        console.error('⚠️ AWS SES SDK failed:', sesError.message);
        console.error('   Error code:', sesError.code);
        console.error('   Error name:', sesError.name);
        // Continue to SMTP fallback
      }
    }
    
    // Try SMTP fallback
    if (emailTransporter) {
      console.log('📧 Sending test email via SMTP...');
      const result = await sendTestEmail();
      
      console.log('✅ Test email sent successfully via SMTP:', result.messageId);
      
      return res.json({
        success: true,
        message: 'Test email sent successfully via SMTP',
        messageId: result.messageId,
        method: 'SMTP',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No email service available',
        details: 'Both AWS SES SDK and SMTP transporter failed to initialize'
      });
    }
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    
    let errorMessage = error.message || 'Unknown error';
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
        'Verify AWS Access Key ID and Secret Access Key are correct',
        'Check if AWS SES is enabled in your region',
        'Verify the FROM_EMAIL is verified in AWS SES'
      ];
    } else if (error.code === 'MessageRejected') {
      errorMessage = 'Email rejected by AWS SES';
      troubleshooting = [
        'Verify the FROM_EMAIL is verified in AWS SES',
        'Check if the email is in sandbox mode and NOTIFICATION_EMAIL is verified',
        'Ensure AWS SES has sending permissions'
      ];
    } else if (error.message.includes('Network is unreachable') || error.code === 'ENETUNREACH') {
      errorMessage = 'Network unreachable - Bolt environment restriction';
      troubleshooting = [
        'This is expected in Bolt sandbox environment',
        'Email will work when deployed to production server',
        'Bolt blocks outbound SMTP connections for security'
      ];
    }
    
    // Add environment-specific troubleshooting
    if (isBoltEnvironment) {
      troubleshooting.unshift('You are in Bolt environment - email will work in production');
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
    email: canSendEmail(),
    awsSes: !!sesClient,
    environment: isBoltEnvironment ? 'bolt' : 'production',
    canSendEmail: canSendEmail()
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
  console.log(`📧 Email available: ${canSendEmail()}`);
  console.log(`🌐 Environment: ${isBoltEnvironment ? 'Bolt (Limited)' : 'Production'}`);
  console.log(`🌐 API: http://localhost:${port}/api`);
});