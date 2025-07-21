#!/bin/bash

echo "🚀 Setting up PM2 for Frontend Only"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Create logs directory
mkdir -p logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 stop abuse-ip-detector-frontend 2>/dev/null || true
pm2 delete abuse-ip-detector-frontend 2>/dev/null || true

# Kill any processes on port 3000
sudo pkill -f "vite preview" || true

# Build the application
echo "🔨 Building application..."
npm run build

# Start the frontend with PM2 using vite preview
echo "🚀 Starting frontend with PM2..."
pm2 start "npx vite preview --host 0.0.0.0 --port 3000" --name "abuse-ip-detector-frontend"

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on boot
echo "🔄 Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "✅ Frontend PM2 setup complete!"
echo ""
echo "📊 PM2 Commands:"
echo "  pm2 status                    - Check application status"
echo "  pm2 logs abuse-ip-detector-frontend  - View logs"
echo "  pm2 restart abuse-ip-detector-frontend - Restart application"
echo "  pm2 stop abuse-ip-detector-frontend    - Stop application"
echo ""
echo "🌐 Your frontend should be running at:"
echo "   http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com:3000"