#!/bin/bash

# Super Easy AWS Deployment - No Hard Work!
set -e

echo "🚀 Super Easy AWS Deployment Starting..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if AWS CLI exists, if not install it
if ! command -v aws &> /dev/null; then
    print_status "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Configure AWS if not configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "🔑 Please enter your AWS credentials:"
    aws configure
fi

print_success "AWS configured!"

# Get account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-us-east-1}
BUCKET_NAME="threat-intel-easy-${ACCOUNT_ID}-$(date +%s)"

print_status "Creating infrastructure..."

# 1. Create S3 bucket for frontend
aws s3 mb s3://$BUCKET_NAME --region $REGION

# 2. Configure bucket for website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# 3. Make bucket public
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

# 4. Create DynamoDB tables (easiest database!)
print_status "Creating DynamoDB tables..."

# Users table
aws dynamodb create-table \
    --table-name ThreatIntel-Users \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Users table might already exist"

# Categories table
aws dynamodb create-table \
    --table-name ThreatIntel-Categories \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Categories table might already exist"

# IP Entries table
aws dynamodb create-table \
    --table-name ThreatIntel-IPEntries \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "IP Entries table might already exist"

# Whitelist table
aws dynamodb create-table \
    --table-name ThreatIntel-Whitelist \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION || echo "Whitelist table might already exist"

print_status "Waiting for tables to be ready..."
sleep 10

# 5. Add default data to DynamoDB
print_status "Adding default data..."

# Add admin user
aws dynamodb put-item \
    --table-name ThreatIntel-Users \
    --item '{
        "id": {"S": "admin-001"},
        "username": {"S": "admin"},
        "email": {"S": "admin@company.com"},
        "password": {"S": "password"},
        "role": {"S": "superadmin"},
        "isActive": {"BOOL": true},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "createdBy": {"S": "system"}
    }' \
    --region $REGION || echo "Admin user might already exist"

# Add default categories
categories='[
    {"id": "malware", "name": "malware", "label": "Malware IPs", "description": "Known malware servers", "color": "bg-red-500", "icon": "Bug"},
    {"id": "phishing", "name": "phishing", "label": "Phishing IPs", "description": "Phishing infrastructure", "color": "bg-orange-500", "icon": "Mail"},
    {"id": "c2", "name": "c2", "label": "C2 IPs", "description": "Command & control servers", "color": "bg-purple-500", "icon": "Server"},
    {"id": "bruteforce", "name": "bruteforce", "label": "Bruteforce IPs", "description": "Brute force sources", "color": "bg-yellow-500", "icon": "Zap"}
]'

echo "$categories" | jq -r '.[] | @base64' | while read category; do
    cat_data=$(echo "$category" | base64 --decode)
    cat_id=$(echo "$cat_data" | jq -r '.id')
    cat_name=$(echo "$cat_data" | jq -r '.name')
    cat_label=$(echo "$cat_data" | jq -r '.label')
    cat_desc=$(echo "$cat_data" | jq -r '.description')
    cat_color=$(echo "$cat_data" | jq -r '.color')
    cat_icon=$(echo "$cat_data" | jq -r '.icon')
    
    aws dynamodb put-item \
        --table-name ThreatIntel-Categories \
        --item '{
            "id": {"S": "'$cat_id'"},
            "name": {"S": "'$cat_name'"},
            "label": {"S": "'$cat_label'"},
            "description": {"S": "'$cat_desc'"},
            "color": {"S": "'$cat_color'"},
            "icon": {"S": "'$cat_icon'"},
            "isDefault": {"BOOL": true},
            "isActive": {"BOOL": true},
            "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
            "createdBy": {"S": "system"}
        }' \
        --region $REGION || echo "Category $cat_name might already exist"
done

# 6. Build React app with DynamoDB config
print_status "Building React application..."

# Create config for DynamoDB
cat > src/config/aws.ts << EOF
export const AWS_CONFIG = {
  region: '$REGION',
  tables: {
    users: 'ThreatIntel-Users',
    categories: 'ThreatIntel-Categories',
    ipEntries: 'ThreatIntel-IPEntries',
    whitelist: 'ThreatIntel-Whitelist'
  }
};
EOF

npm run build

# 7. Deploy to S3
print_status "Deploying to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# 8. Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

print_success "🎉 Deployment Complete!"
echo ""
echo "📋 Your Threat Intelligence System:"
echo "🌐 Website: $WEBSITE_URL"
echo "🔐 Login: admin / password"
echo "💾 Database: DynamoDB (4 tables created)"
echo "💰 Cost: ~$2-5/month"
echo ""
echo "🚀 Ready to use!"