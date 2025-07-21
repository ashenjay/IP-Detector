# 🚀 AWS SAM Deployment Guide - IP Threat Management System

This guide will help you deploy your IP Threat Management System to AWS using SAM (Serverless Application Model).

## 📋 Prerequisites

### 1. Install Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install SAM CLI
pip install aws-sam-cli

# Verify installations
aws --version
sam --version
```

### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter output format (json)
```

### 3. Get API Keys
- **AbuseIPDB**: Sign up at https://www.abuseipdb.com/api
- **VirusTotal**: Sign up at https://www.virustotal.com/gui/join-us

## 🚀 Quick Deployment

### Option 1: Automated Deployment Script
```bash
# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment (will prompt for API keys)
./deploy.sh dev
```

### Option 2: Manual Deployment
```bash
# 1. Install Lambda dependencies
cd src/lambda/auth && npm install --production && cd ../../..
cd src/lambda/ip-entries && npm install --production && cd ../../..

# 2. Build SAM application
sam build

# 3. Deploy with guided setup
sam deploy --guided \
    --parameter-overrides \
        Environment=dev \
        AbuseIPDBKey=YOUR_ABUSEIPDB_KEY \
        VirusTotalKey=YOUR_VIRUSTOTAL_KEY

# 4. Build and deploy frontend
npm run build
aws s3 sync dist/ s3://YOUR_FRONTEND_BUCKET --delete
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   S3 Bucket      │    │   API Gateway   │
│   (CDN)         │    │   (Frontend)     │    │   (REST API)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 │                                 │
                ┌──────▼──────┐                   ┌──────▼──────┐                 ┌──────▼──────┐
                │   Auth      │                   │ IP Entries  │                 │  Categories │
                │   Lambda    │                   │   Lambda    │                 │   Lambda    │
                └─────────────┘                   └─────────────┘                 └─────────────┘
                       │                                 │                                 │
                ┌──────▼──────┐                   ┌──────▼──────┐                 ┌──────▼──────┐
                │   Users     │                   │ IP Entries  │                 │ Categories  │
                │ DynamoDB    │                   │ DynamoDB    │                 │ DynamoDB    │
                └─────────────┘                   └─────────────┘                 └─────────────┘
```

## 📊 AWS Resources Created

### **Compute & API**
- **6 Lambda Functions**: Auth, Users, Categories, IP Entries, Whitelist, EDL, Sync
- **1 API Gateway**: REST API with CORS enabled
- **1 EventBridge Rule**: Scheduled threat intel sync (every 6 hours)

### **Storage**
- **4 DynamoDB Tables**: Users, Categories, IP Entries, Whitelist
- **1 S3 Bucket**: Frontend hosting
- **1 Secrets Manager**: API keys storage

### **CDN & Security**
- **1 CloudFront Distribution**: Global content delivery
- **IAM Roles & Policies**: Least privilege access
- **SSL/TLS Certificates**: Automatic HTTPS

## 🔧 Configuration

### Environment Variables (Auto-configured)
```bash
DYNAMODB_TABLE_USERS=dev-threat-intel-users
DYNAMODB_TABLE_CATEGORIES=dev-threat-intel-categories
DYNAMODB_TABLE_IP_ENTRIES=dev-threat-intel-ip-entries
DYNAMODB_TABLE_WHITELIST=dev-threat-intel-whitelist
SECRETS_NAME=dev-threat-intel-api-keys
```

### API Endpoints
```
POST   /api/auth/login              # User authentication
POST   /api/auth/logout             # User logout
GET    /api/users                   # Get all users
POST   /api/users                   # Create user
PUT    /api/users/{id}              # Update user
DELETE /api/users/{id}              # Delete user
GET    /api/categories              # Get categories
POST   /api/categories              # Create category
PUT    /api/categories/{id}         # Update category
DELETE /api/categories/{id}         # Delete category
GET    /api/ip-entries              # Get IP entries
POST   /api/ip-entries              # Create IP entry
PUT    /api/ip-entries/{id}         # Update IP entry
DELETE /api/ip-entries/{id}         # Delete IP entry
GET    /api/ip-entries/check/{ip}   # Check IP reputation
GET    /api/whitelist               # Get whitelist
POST   /api/whitelist               # Add to whitelist
DELETE /api/whitelist/{id}          # Remove from whitelist
GET    /api/edl/{category}          # Get EDL feed
POST   /api/sync/abuseipdb          # Sync AbuseIPDB
POST   /api/sync/virustotal         # Sync VirusTotal
```

## 💰 Cost Estimation

### Monthly Costs (Typical Usage)
| Service | Usage | Cost |
|---------|-------|------|
| **Lambda** | 1M requests, 512MB, 5s avg | $8-12 |
| **API Gateway** | 1M requests | $3.50 |
| **DynamoDB** | 1M reads/writes | $2-5 |
| **S3** | 1GB storage, 10GB transfer | $1-2 |
| **CloudFront** | 100GB transfer | $8-10 |
| **Secrets Manager** | 1 secret | $0.40 |
| **EventBridge** | 720 scheduled events | $0.01 |
| **Total** | | **$23-33/month** |

### Cost Optimization Tips
- **DynamoDB**: Use on-demand billing for variable workloads
- **Lambda**: Optimize memory allocation and execution time
- **CloudFront**: Use appropriate price class for your region
- **S3**: Enable intelligent tiering for long-term storage

## 🔒 Security Features

### **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC)
- Session management

### **API Security**
- CORS properly configured
- Rate limiting via API Gateway
- Input validation and sanitization

### **Data Protection**
- Encryption at rest (DynamoDB, S3)
- Encryption in transit (HTTPS/TLS)
- API keys stored in Secrets Manager

### **Network Security**
- CloudFront with security headers
- WAF rules (optional, can be added)
- VPC endpoints (optional, for enhanced security)

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: aws-actions/setup-sam@v1
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and Deploy
        run: |
          sam build
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
```

## 🛠️ Maintenance & Monitoring

### **Monitoring**
```bash
# View Lambda logs
sam logs -n AuthFunction --stack-name threat-intel-stack --tail

# Monitor API Gateway
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway/"

# DynamoDB metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/DynamoDB \
    --metric-name ConsumedReadCapacityUnits \
    --dimensions Name=TableName,Value=dev-threat-intel-ip-entries
```

### **Backup Strategy**
```bash
# Enable point-in-time recovery (already enabled in template)
aws dynamodb describe-continuous-backups --table-name dev-threat-intel-users

# Create on-demand backup
aws dynamodb create-backup \
    --table-name dev-threat-intel-ip-entries \
    --backup-name ip-entries-backup-$(date +%Y%m%d)
```

### **Updates & Scaling**
```bash
# Update Lambda function code
sam build && sam deploy

# Scale DynamoDB (if needed)
aws dynamodb update-table \
    --table-name dev-threat-intel-ip-entries \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

## 🚨 Troubleshooting

### Common Issues

#### **1. Deployment Fails**
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name threat-intel-stack

# Validate template
sam validate
```

#### **2. Lambda Function Errors**
```bash
# View function logs
sam logs -n IPEntriesFunction --stack-name threat-intel-stack --tail

# Test function locally
sam local invoke IPEntriesFunction -e events/test-event.json
```

#### **3. API Gateway Issues**
```bash
# Test API endpoint
curl -X GET https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/api/categories

# Check API Gateway logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway/"
```

#### **4. DynamoDB Access Issues**
```bash
# Check table status
aws dynamodb describe-table --table-name dev-threat-intel-users

# Verify IAM permissions
aws iam get-role-policy --role-name threat-intel-stack-IPEntriesFunction-Role --policy-name DynamoDBCrudPolicy
```

## 📞 Support

### **Getting Help**
1. **AWS Documentation**: https://docs.aws.amazon.com/sam/
2. **SAM CLI Issues**: https://github.com/aws/aws-sam-cli/issues
3. **AWS Support**: Create a support case in AWS Console

### **Useful Commands**
```bash
# Delete entire stack
sam delete --stack-name threat-intel-stack

# View stack outputs
aws cloudformation describe-stacks --stack-name threat-intel-stack --query 'Stacks[0].Outputs'

# Update specific function
sam deploy --parameter-overrides Environment=dev
```

---

## 🎉 Success!

After deployment, you'll have:
- ✅ **Scalable serverless architecture**
- ✅ **Global CDN distribution**
- ✅ **Automatic threat intel sync**
- ✅ **Production-ready security**
- ✅ **Cost-optimized infrastructure**

Your IP Threat Management System is now running on AWS! 🛡️

**Access your application at**: `https://your-cloudfront-domain.cloudfront.net`

**Default credentials**: `admin` / `password` (change immediately!)