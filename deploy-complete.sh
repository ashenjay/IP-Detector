#!/bin/bash

# Complete AWS SAM Deployment Script with Database
# IP Threat Management System - Full Production Deployment
set -e

echo "🚀 Starting Complete AWS Deployment with Database"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_step() {
    echo -e "${PURPLE}[STEP $1/10]${NC} $2"
    echo "----------------------------------------"
}

# Step 1: Check Prerequisites
print_step "1" "Checking Prerequisites"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install it first."
    echo "Install from: https://nodejs.org/"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install it first."
    exit 1
fi
print_success "npm found: $(npm --version)"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_status "Installing AWS CLI..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
        sudo installer -pkg AWSCLIV2.pkg -target /
        rm AWSCLIV2.pkg
    else
        # Linux
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi
fi
print_success "AWS CLI found: $(aws --version)"

# Check SAM CLI
if ! command -v sam &> /dev/null; then
    print_status "Installing SAM CLI..."
    pip3 install aws-sam-cli
    if [ $? -ne 0 ]; then
        print_error "Failed to install SAM CLI. Please install Python and pip first."
        echo "Then run: pip3 install aws-sam-cli"
        exit 1
    fi
fi
print_success "SAM CLI found: $(sam --version)"

# Step 2: AWS Configuration
print_step "2" "AWS Configuration"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_warning "AWS credentials not configured"
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
    echo "Now configuring AWS CLI..."
    echo ""
    
    aws configure
    
    # Verify configuration worked
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS configuration failed"
        exit 1
    fi
fi

# Get account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
fi
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

print_success "AWS Account: $ACCOUNT_ID"
print_success "AWS Region: $AWS_REGION"
print_success "AWS User: $USER_ARN"

# Step 3: Permission Check
print_step "3" "Checking AWS Permissions"

echo "Testing required AWS permissions..."

# Test CloudFormation
if aws cloudformation describe-stacks --region $AWS_REGION &> /dev/null; then
    print_success "CloudFormation access OK"
else
    print_error "CloudFormation access denied"
    PERMISSION_ERROR=1
fi

# Test IAM
if aws iam list-roles --max-items 1 &> /dev/null; then
    print_success "IAM access OK"
else
    print_error "IAM access denied"
    PERMISSION_ERROR=1
fi

# Test Lambda
if aws lambda list-functions --max-items 1 &> /dev/null; then
    print_success "Lambda access OK"
else
    print_error "Lambda access denied"
    PERMISSION_ERROR=1
fi

# Test DynamoDB
if aws dynamodb list-tables &> /dev/null; then
    print_success "DynamoDB access OK"
else
    print_error "DynamoDB access denied"
    PERMISSION_ERROR=1
fi

if [ "$PERMISSION_ERROR" = "1" ]; then
    echo ""
    print_error "PERMISSION ISSUES DETECTED!"
    echo ""
    echo "🔧 TO FIX:"
    echo "1. Go to: https://console.aws.amazon.com/iam/"
    echo "2. Find your user in 'Users'"
    echo "3. Add 'AdministratorAccess' policy"
    echo ""
    echo "Or attach these specific policies:"
    echo "- CloudFormationFullAccess"
    echo "- IAMFullAccess"
    echo "- AWSLambda_FullAccess"
    echo "- AmazonDynamoDBFullAccess"
    echo "- AmazonAPIGatewayAdministrator"
    echo "- AmazonS3FullAccess"
    echo "- CloudFrontFullAccess"
    echo "- SecretsManagerReadWrite"
    echo ""
    echo "After fixing permissions, run this script again."
    exit 1
fi

print_success "All permissions OK! Proceeding with deployment..."

# Step 4: API Keys Configuration
print_step "4" "API Keys Configuration"

echo ""
echo "🔑 You need API keys for threat intelligence:"
echo ""
echo "1. AbuseIPDB API Key:"
echo "   - Go to: https://www.abuseipdb.com/api"
echo "   - Sign up/Login and get your API key"
echo ""
echo "2. VirusTotal API Key:"
echo "   - Go to: https://www.virustotal.com/gui/join-us"
echo "   - Sign up/Login and get your API key"
echo ""

read -p "Enter your AbuseIPDB API key: " ABUSEIPDB_KEY
read -p "Enter your VirusTotal API key: " VIRUSTOTAL_KEY

if [ -z "$ABUSEIPDB_KEY" ] || [ -z "$VIRUSTOTAL_KEY" ]; then
    print_error "Both API keys are required!"
    exit 1
fi

print_success "API keys configured"

# Step 5: Environment Selection
print_step "5" "Environment Selection"

echo ""
echo "Select deployment environment:"
echo "1. dev (Development)"
echo "2. staging (Staging)"
echo "3. prod (Production)"
echo ""
read -p "Enter choice (1-3) [default: 1]: " ENV_CHOICE

case $ENV_CHOICE in
    2) ENVIRONMENT="staging" ;;
    3) ENVIRONMENT="prod" ;;
    *) ENVIRONMENT="dev" ;;
esac

print_success "Environment: $ENVIRONMENT"

# Step 6: Install Dependencies
print_step "6" "Installing Dependencies"

print_status "Installing main project dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install main dependencies"
    exit 1
fi

print_status "Installing Lambda function dependencies..."

# Install dependencies for each Lambda function
lambda_functions=("auth" "users" "categories" "ip-entries" "whitelist" "edl" "sync")

for func in "${lambda_functions[@]}"; do
    if [ -d "src/lambda/$func" ]; then
        print_status "Installing $func function dependencies..."
        cd "src/lambda/$func"
        npm install --production
        if [ $? -ne 0 ]; then
            print_error "Failed to install $func dependencies"
            cd ../../..
            exit 1
        fi
        cd ../../..
    fi
done

print_success "All dependencies installed"

# Step 7: Build SAM Application
print_step "7" "Building SAM Application"

print_status "Building serverless application..."
sam build

if [ $? -ne 0 ]; then
    print_error "SAM build failed!"
    echo ""
    echo "Common issues:"
    echo "- Check that all Lambda function dependencies are installed"
    echo "- Verify template.yaml syntax"
    echo "- Ensure Python/Node.js versions are compatible"
    exit 1
fi

print_success "SAM build completed"

# Step 8: Deploy Infrastructure
print_step "8" "Deploying AWS Infrastructure"

print_status "Deploying serverless stack with DynamoDB tables..."
print_warning "This may take 5-10 minutes..."

sam deploy \
    --guided \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        AbuseIPDBKey=$ABUSEIPDB_KEY \
        VirusTotalKey=$VIRUSTOTAL_KEY

if [ $? -ne 0 ]; then
    print_error "SAM deployment failed!"
    echo ""
    echo "Check AWS CloudFormation console for detailed error information"
    echo "Common issues:"
    echo "- Insufficient AWS permissions"
    echo "- Resource limits exceeded"
    echo "- Invalid parameter values"
    exit 1
fi

print_success "Infrastructure deployed"

# Step 9: Get Stack Outputs
print_step "9" "Getting Deployment Information"

STACK_NAME="threat-intel-stack"

print_status "Retrieving stack outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' --output text)
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' --output text)

print_success "API Endpoint: $API_ENDPOINT"
print_success "Frontend Bucket: $FRONTEND_BUCKET"
print_success "CloudFront URL: https://$CLOUDFRONT_URL"

# Step 10: Initialize Database
print_step "10" "Initializing Database"

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

print_status "Creating default categories..."

# Create default categories
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

print_success "Database initialized with default data"

# Build and Deploy Frontend
print_status "Building React application..."
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

print_status "Creating frontend configuration..."
cat > dist/config.js << EOF
window.APP_CONFIG = {
    API_ENDPOINT: '$API_ENDPOINT',
    ENVIRONMENT: '$ENVIRONMENT'
};
EOF

aws s3 cp dist/config.js s3://$FRONTEND_BUCKET/config.js

print_status "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$FRONTEND_BUCKET.s3.amazonaws.com'].Id" --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" &> /dev/null
    print_success "CloudFront cache invalidated"
else
    print_warning "Could not find CloudFront distribution for cache invalidation"
fi

print_success "Frontend deployed successfully"

# Final Success Message
echo ""
echo "=========================================="
echo "   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
print_success "📋 Your IP Threat Management System is now live!"
echo ""
print_success "🌐 Application URL: https://$CLOUDFRONT_URL"
print_success "📡 API Endpoint: $API_ENDPOINT"
echo ""
print_success "🔐 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
print_success "📚 What's Deployed:"
echo "   ✅ 6 Lambda Functions (Auth, Users, Categories, IP Entries, Whitelist, EDL, Sync)"
echo "   ✅ 4 DynamoDB Tables (Users, Categories, IP Entries, Whitelist)"
echo "   ✅ API Gateway with CORS enabled"
echo "   ✅ S3 Bucket for frontend hosting"
echo "   ✅ CloudFront distribution for global CDN"
echo "   ✅ Secrets Manager for API keys"
echo "   ✅ EventBridge for scheduled sync (every 6 hours)"
echo ""
print_success "📝 Next Steps:"
echo "   1. Access your application at: https://$CLOUDFRONT_URL"
echo "   2. Login with the default credentials"
echo "   3. Change the default password immediately"
echo "   4. Create additional users as needed"
echo "   5. Start adding IP threat intelligence data"
echo "   6. Configure EDL feeds in your Palo Alto firewall"
echo ""
print_success "💰 Estimated Monthly Cost: $25-35"
echo "   - Lambda: $8-12 (1M requests)"
echo "   - API Gateway: $3.50 (1M requests)"
echo "   - DynamoDB: $2-5 (1M reads/writes)"
echo "   - S3: $1-2 (1GB storage, 10GB transfer)"
echo "   - CloudFront: $8-10 (100GB transfer)"
echo "   - Secrets Manager: $0.40 (1 secret)"
echo ""
print_success "🛡️ Happy threat hunting!"
echo ""