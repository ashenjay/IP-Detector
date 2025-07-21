#!/bin/bash

# Cost-Effective AWS Deployment Script
set -e

echo "🚀 Starting Cost-Effective AWS Deployment"

# Colors for output
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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_status "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Please configure AWS credentials:"
    aws configure
fi

print_success "AWS CLI configured!"

# Get API keys
echo ""
print_status "API Keys (optional for basic deployment):"
read -p "AbuseIPDB API key (press Enter to skip): " ABUSEIPDB_KEY
read -p "VirusTotal API key (press Enter to skip): " VIRUSTOTAL_KEY

# Create unique bucket name
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="threat-intel-app-${ACCOUNT_ID}-$(date +%s)"
REGION=${AWS_DEFAULT_REGION:-us-east-1}

print_status "Creating S3 bucket: $BUCKET_NAME"

# Create S3 bucket for static hosting
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Configure bucket for static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Create bucket policy for public read access
cat > bucket-policy.json << EOF
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

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# Build the React app
print_status "Building React application..."
npm run build

# Update the app to use local storage instead of API for demo
cat > dist/config.js << 'EOF'
// Local storage configuration for cost-effective deployment
window.APP_CONFIG = {
    USE_LOCAL_STORAGE: true,
    API_ENDPOINT: null
};
EOF

# Deploy to S3
print_status "Deploying to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

print_success "🎉 Deployment completed!"
echo ""
echo "📋 Access Information:"
echo "🌐 Website URL: $WEBSITE_URL"
echo "💰 Estimated cost: $0.50-2.00/month"
echo ""
echo "🔐 Demo Login:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "📝 Note: This uses local browser storage for demo purposes"
echo "   For production with API, use the full SAM deployment"

# Optional: Create CloudFront distribution for HTTPS and better performance
read -p "Create CloudFront distribution for HTTPS? (y/n): " CREATE_CF

if [[ $CREATE_CF == "y" || $CREATE_CF == "Y" ]]; then
    print_status "Creating CloudFront distribution..."
    
    cat > cloudfront-config.json << EOF
{
    "CallerReference": "threat-intel-$(date +%s)",
    "Comment": "Threat Intel App Distribution",
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

    DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --query 'Distribution.Id' --output text)
    rm cloudfront-config.json
    
    print_success "CloudFront distribution created: $DISTRIBUTION_ID"
    print_warning "CloudFront deployment takes 15-20 minutes to complete"
    echo "HTTPS URL will be: https://$DISTRIBUTION_ID.cloudfront.net"
fi

print_success "🎉 Cost-effective deployment complete!"