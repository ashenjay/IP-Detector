#!/bin/bash

# Threat Intelligence System - AWS SAM Deployment Script
set -e

echo "🚀 Starting AWS SAM Deployment for Threat Intelligence System"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    print_error "SAM CLI is not installed. Please install it first."
    echo "Install with: pip install aws-sam-cli"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

print_success "Prerequisites check passed!"

# Get API keys from user
echo ""
print_status "Please provide your API keys:"
read -p "Enter your AbuseIPDB API key: " ABUSEIPDB_KEY
read -p "Enter your VirusTotal API key: " VIRUSTOTAL_KEY

if [ -z "$ABUSEIPDB_KEY" ] || [ -z "$VIRUSTOTAL_KEY" ]; then
    print_error "Both API keys are required!"
    exit 1
fi

# Set environment (default to dev)
ENVIRONMENT=${1:-dev}
print_status "Deploying to environment: $ENVIRONMENT"

# Install dependencies for Lambda functions
print_status "Installing Lambda function dependencies..."

# Auth function
if [ -d "src/lambda/auth" ]; then
    cd src/lambda/auth
    npm install --production
    cd ../../..
fi

# IP Entries function
if [ -d "src/lambda/ip-entries" ]; then
    cd src/lambda/ip-entries
    npm install --production
    cd ../../..
fi

print_success "Dependencies installed!"

# Build the SAM application
print_status "Building SAM application..."
sam build

if [ $? -ne 0 ]; then
    print_error "SAM build failed!"
    exit 1
fi

print_success "SAM build completed!"

# Deploy the application
print_status "Deploying SAM application..."
sam deploy \
    --guided \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        AbuseIPDBKey=$ABUSEIPDB_KEY \
        VirusTotalKey=$VIRUSTOTAL_KEY

if [ $? -ne 0 ]; then
    print_error "SAM deployment failed!"
    exit 1
fi

print_success "SAM deployment completed!"

# Get stack outputs
print_status "Getting stack outputs..."
STACK_NAME="threat-intel-stack"
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' --output text)
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' --output text)

echo ""
print_success "Deployment Information:"
echo "📡 API Endpoint: $API_ENDPOINT"
echo "🪣 Frontend Bucket: $FRONTEND_BUCKET"
echo "🌐 CloudFront URL: https://$CLOUDFRONT_URL"

# Initialize default data
print_status "Initializing default data..."

# Create default admin user
print_status "Creating default admin user..."
aws dynamodb put-item \
    --table-name "${ENVIRONMENT}-threat-intel-users" \
    --item '{
        "id": {"S": "admin-001"},
        "username": {"S": "admin"},
        "email": {"S": "admin@company.com"},
        "password": {"S": "password"},
        "role": {"S": "superadmin"},
        "isActive": {"BOOL": true},
        "createdBy": {"S": "system"},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}'
    }' || print_warning "Admin user might already exist"

# Create default categories
print_status "Creating default categories..."

categories='[
    {"id": "malware", "name": "malware", "label": "Malware IPs", "description": "Known malware command & control servers", "color": "bg-red-500", "icon": "Bug", "isDefault": true, "isActive": true, "createdBy": "system"},
    {"id": "phishing", "name": "phishing", "label": "Phishing IPs", "description": "Phishing campaign infrastructure", "color": "bg-orange-500", "icon": "Mail", "isDefault": true, "isActive": true, "createdBy": "system"},
    {"id": "c2", "name": "c2", "label": "C2 IPs", "description": "Command & control servers", "color": "bg-purple-500", "icon": "Server", "isDefault": true, "isActive": true, "createdBy": "system"},
    {"id": "bruteforce", "name": "bruteforce", "label": "Bruteforce IPs", "description": "Brute force attack sources", "color": "bg-yellow-500", "icon": "Zap", "isDefault": true, "isActive": true, "createdBy": "system"},
    {"id": "sources", "name": "sources", "label": "Source Intelligence", "description": "Threat intelligence from external sources", "color": "bg-indigo-500", "icon": "Database", "isDefault": true, "isActive": true, "createdBy": "system"}
]'

echo "$categories" | jq -r '.[] | @base64' | while read category; do
    cat_data=$(echo "$category" | base64 --decode)
    cat_id=$(echo "$cat_data" | jq -r '.id')
    cat_name=$(echo "$cat_data" | jq -r '.name')
    cat_label=$(echo "$cat_data" | jq -r '.label')
    cat_desc=$(echo "$cat_data" | jq -r '.description')
    cat_color=$(echo "$cat_data" | jq -r '.color')
    cat_icon=$(echo "$cat_data" | jq -r '.icon')
    cat_default=$(echo "$cat_data" | jq -r '.isDefault')
    cat_active=$(echo "$cat_data" | jq -r '.isActive')
    cat_created_by=$(echo "$cat_data" | jq -r '.createdBy')
    
    aws dynamodb put-item \
        --table-name "${ENVIRONMENT}-threat-intel-categories" \
        --item '{
            "id": {"S": "'$cat_id'"},
            "name": {"S": "'$cat_name'"},
            "label": {"S": "'$cat_label'"},
            "description": {"S": "'$cat_desc'"},
            "color": {"S": "'$cat_color'"},
            "icon": {"S": "'$cat_icon'"},
            "isDefault": {"BOOL": '$cat_default'},
            "isActive": {"BOOL": '$cat_active'},
            "createdBy": {"S": "'$cat_created_by'"},
            "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}
        }' || print_warning "Category $cat_name might already exist"
done

print_success "Default data initialized!"

# Build and deploy frontend
print_status "Building frontend application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Frontend build failed!"
    exit 1
fi

print_status "Deploying frontend to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete

if [ $? -ne 0 ]; then
    print_error "Frontend deployment failed!"
    exit 1
fi

print_success "Frontend deployed successfully!"

# Update frontend config with API endpoint
print_status "Updating frontend configuration..."
cat > dist/config.js << EOF
window.APP_CONFIG = {
    API_ENDPOINT: '$API_ENDPOINT',
    ENVIRONMENT: '$ENVIRONMENT'
};
EOF

aws s3 cp dist/config.js s3://$FRONTEND_BUCKET/config.js

print_success "Frontend configuration updated!"

# Invalidate CloudFront cache
print_status "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$FRONTEND_BUCKET.s3.amazonaws.com'].Id" --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    print_success "CloudFront cache invalidated!"
else
    print_warning "Could not find CloudFront distribution for cache invalidation"
fi

echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
echo "📋 Access Information:"
echo "🌐 Application URL: https://$CLOUDFRONT_URL"
echo "📡 API Endpoint: $API_ENDPOINT"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
echo "📚 Next Steps:"
echo "1. Access your application at: https://$CLOUDFRONT_URL"
echo "2. Login with the default credentials"
echo "3. Change the default password"
echo "4. Create additional users as needed"
echo "5. Start adding IP threat intelligence data"
echo ""
print_success "Happy threat hunting! 🛡️"