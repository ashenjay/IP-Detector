#!/bin/bash

echo "🚀 Setting up Nginx reverse proxy for Abuse IP Detector"
echo "======================================================="

# Install Nginx
echo "📦 Installing Nginx..."
sudo yum update -y
sudo yum install -y nginx

# Create Nginx configuration
echo "⚙️ Creating Nginx configuration..."
sudo tee /etc/nginx/conf.d/abuse-ip-detector.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # API specific settings
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache static files
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOF

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Start and enable Nginx
echo "🚀 Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Check Nginx status
echo "📊 Nginx status:"
sudo systemctl status nginx --no-pager

echo ""
echo "✅ Nginx reverse proxy setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "========================"
echo "🌐 Public URL: http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com"
echo "🔒 Port 3000: Now only accessible internally (127.0.0.1:3000)"
echo "🌍 Port 80: Public access through Nginx"
echo ""
echo "📝 Next Steps:"
echo "1. Update AWS Security Group to only allow port 80 (HTTP)"
echo "2. Remove port 3000 from Security Group"
echo "3. Test the application at: http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com"
echo ""