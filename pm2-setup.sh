#!/bin/bash

echo "🚀 Setting up PM2 for Abuse IP Detector"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 stop abuse-ip-detector 2>/dev/null || true
pm2 delete abuse-ip-detector 2>/dev/null || true

# Kill any node processes on port 3000
sudo pkill -f "node.*server.js" || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on boot
echo "🔄 Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "✅ PM2 setup complete!"
echo ""
echo "📊 PM2 Commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart application"
echo "  pm2 stop all        - Stop application"
echo "  pm2 monit           - Monitor resources"
echo ""
echo "🌐 Your application should be running at:"
echo "   http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com:3000"