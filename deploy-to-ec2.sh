#!/bin/bash

# Deploy to EC2 Instance
# Usage: ./deploy-to-ec2.sh your-key.pem

if [ -z "$1" ]; then
    echo "Usage: ./deploy-to-ec2.sh your-key-file.pem"
    echo "Example: ./deploy-to-ec2.sh my-key.pem"
    exit 1
fi

KEY_FILE=$1
EC2_HOST="ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com"
EC2_USER="ec2-user"

echo "🚀 Deploying to EC2: $EC2_HOST"

# Build the frontend
echo "📦 Building frontend..."
npm run build

# Upload dist folder to EC2
echo "📤 Uploading frontend files..."
scp -i $KEY_FILE -r dist/ $EC2_USER@$EC2_HOST:/home/ec2-user/

# Upload server files
echo "📤 Uploading server files..."
scp -i $KEY_FILE server.js package.json $EC2_USER@$EC2_HOST:/home/ec2-user/

# Connect to EC2 and setup
echo "🔧 Setting up on EC2..."
ssh -i $KEY_FILE $EC2_USER@$EC2_HOST << 'EOF'
# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install dependencies
npm install

# Create .env file (you'll need to edit this with your database details)
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret-key
ENVEOF

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "1. Edit .env file with your database details: nano .env"
echo "2. Start the server: npm start"
echo "3. Access your app at: http://$EC2_HOST:3000"

EOF

echo "🎉 Deployment script completed!"
echo "📝 Don't forget to:"
echo "1. SSH to your EC2 and edit the .env file with your database details"
echo "2. Make sure your security group allows port 3000"