#!/bin/bash

# 🚀 SUPER EASY AWS DEPLOYMENT - No Hard Work!
set -e

echo "🚀 Starting Super Easy AWS Deployment..."

# Colors for pretty output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Step 1: Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    print_status "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    print_success "AWS CLI installed!"
fi

# Step 2: Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo ""
    echo "🔑 AWS Credentials Setup Required"
    echo "=================================="
    echo ""
    echo "You need AWS credentials to deploy. Here's how to get them:"
    echo ""
    echo "1. Go to: https://console.aws.amazon.com/"
    echo "2. Sign in to your AWS account"
    echo "3. Click your name (top right) → Security credentials"
    echo "4. Scroll to 'Access keys' → Create access key"
    echo "5. Choose 'Command Line Interface (CLI)'"
    echo "6. Copy both keys"
    echo ""
    echo "Now enter your credentials:"
    echo ""
    
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    read -p "AWS Region (press Enter for us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    # Configure AWS
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
    aws configure set default.region "$AWS_REGION"
    aws configure set default.output "json"
    
    print_success "AWS credentials configured!"
fi

# Get account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
BUCKET_NAME="abuse-ip-detector-${ACCOUNT_ID}-$(date +%s)"

print_status "Deploying to AWS Account: $ACCOUNT_ID"
print_status "Region: $REGION"
print_status "Bucket: $BUCKET_NAME"

# Step 3: Create S3 bucket
print_status "Creating S3 bucket for hosting..."
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Step 4: Configure bucket for website hosting
print_status "Configuring website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Step 5: Create bucket policy for public access
print_status "Setting up public access..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json
rm /tmp/bucket-policy.json

# Step 6: Build the React app
print_status "Building React application..."
npm run build

# Step 7: Deploy to S3
print_status "Uploading files to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Step 8: Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

print_success "🎉 Deployment Complete!"
echo ""
echo "📋 Your Abuse IP Detector is now live!"
echo "🌐 Website URL: $WEBSITE_URL"
echo "💰 Estimated cost: $1-3/month"
echo ""
echo "🔐 Demo Login Credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "📝 Features Available:"
echo "   ✅ IP threat management"
echo "   ✅ Category-based organization"
echo "   ✅ User management (superadmin only)"
echo "   ✅ Whitelist management"
echo "   ✅ EDL feed generation"
echo "   ✅ AbuseIPDB & VirusTotal integration"
echo ""
echo "🚀 Ready to use!"

# Optional: Create CloudFront distribution for HTTPS
echo ""
read -p "🌐 Create CloudFront distribution for HTTPS? (y/n): " CREATE_CF

if [[ $CREATE_CF == "y" || $CREATE_CF == "Y" ]]; then
    print_status "Creating CloudFront distribution..."
    
    cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "abuse-ip-detector-$(date +%s)",
    "Comment": "Abuse IP Detector Distribution",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3-website-$REGION.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        }
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

    DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config file:///tmp/cloudfront-config.json --query 'Distribution.Id' --output text)
    rm /tmp/cloudfront-config.json
    
    print_success "CloudFront distribution created: $DISTRIBUTION_ID"
    print_warning "CloudFront deployment takes 15-20 minutes to complete"
    echo "HTTPS URL will be: https://$DISTRIBUTION_ID.cloudfront.net"
fi

print_success "🎉 AWS deployment complete!"