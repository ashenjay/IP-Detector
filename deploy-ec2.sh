#!/bin/bash

# EC2 + RDS Deployment Script for IP Threat Management System
set -e

echo "🚀 Starting EC2 + RDS Deployment"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[STEP $1/8]${NC} $2"
    echo "----------------------------------------"
}

# Step 1: Prerequisites Check
print_step "1" "Checking Prerequisites"

if ! command -v aws &> /dev/null; then
    print_status "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

if ! aws sts get-caller-identity &> /dev/null; then
    print_warning "AWS credentials not configured"
    aws configure
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
fi

print_success "AWS Account: $ACCOUNT_ID"
print_success "AWS Region: $AWS_REGION"

# Step 2: Get Configuration
print_step "2" "Configuration Setup"

echo "Enter your configuration:"
read -p "Project Name [threat-intel]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-threat-intel}

read -p "Environment [dev]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-dev}

read -p "EC2 Instance Type [t3.micro]: " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.micro}

read -p "RDS Instance Type [db.t3.micro]: " RDS_INSTANCE_TYPE
RDS_INSTANCE_TYPE=${RDS_INSTANCE_TYPE:-db.t3.micro}

read -p "Database Password: " -s DB_PASSWORD
echo ""

read -p "AbuseIPDB API Key: " ABUSEIPDB_KEY
read -p "VirusTotal API Key: " VIRUSTOTAL_KEY

print_success "Configuration collected"

# Step 3: Create Key Pair
print_step "3" "Creating EC2 Key Pair"

KEY_NAME="${PROJECT_NAME}-${ENVIRONMENT}-key"
aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem
chmod 400 ${KEY_NAME}.pem

print_success "Key pair created: ${KEY_NAME}.pem"

# Step 4: Create VPC and Security Groups
print_step "4" "Creating Network Infrastructure"

# Create VPC
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value="${PROJECT_NAME}-${ENVIRONMENT}-vpc"

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value="${PROJECT_NAME}-${ENVIRONMENT}-igw"

# Create Subnets
SUBNET_PUBLIC_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a --query 'Subnet.SubnetId' --output text)
SUBNET_PRIVATE_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b --query 'Subnet.SubnetId' --output text)

aws ec2 create-tags --resources $SUBNET_PUBLIC_ID --tags Key=Name,Value="${PROJECT_NAME}-${ENVIRONMENT}-public-subnet"
aws ec2 create-tags --resources $SUBNET_PRIVATE_ID --tags Key=Name,Value="${PROJECT_NAME}-${ENVIRONMENT}-private-subnet"

# Enable auto-assign public IP for public subnet
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_PUBLIC_ID --map-public-ip-on-launch

# Create Route Table
ROUTE_TABLE_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
aws ec2 associate-route-table --subnet-id $SUBNET_PUBLIC_ID --route-table-id $ROUTE_TABLE_ID
aws ec2 create-tags --resources $ROUTE_TABLE_ID --tags Key=Name,Value="${PROJECT_NAME}-${ENVIRONMENT}-rt"

# Create Security Groups
WEB_SG_ID=$(aws ec2 create-security-group --group-name "${PROJECT_NAME}-${ENVIRONMENT}-web-sg" --description "Web Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)
DB_SG_ID=$(aws ec2 create-security-group --group-name "${PROJECT_NAME}-${ENVIRONMENT}-db-sg" --description "Database Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)

# Web Security Group Rules
aws ec2 authorize-security-group-ingress --group-id $WEB_SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $WEB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $WEB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $WEB_SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0

# Database Security Group Rules
aws ec2 authorize-security-group-ingress --group-id $DB_SG_ID --protocol tcp --port 5432 --source-group $WEB_SG_ID

print_success "Network infrastructure created"

# Step 5: Create RDS Database
print_step "5" "Creating RDS Database"

# Create DB Subnet Group
aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT_NAME}-${ENVIRONMENT}-db-subnet-group" \
    --db-subnet-group-description "Database subnet group" \
    --subnet-ids $SUBNET_PUBLIC_ID $SUBNET_PRIVATE_ID

# Create RDS Instance
aws rds create-db-instance \
    --db-instance-identifier "${PROJECT_NAME}-${ENVIRONMENT}-db" \
    --db-instance-class $RDS_INSTANCE_TYPE \
    --engine postgres \
    --master-username postgres \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --vpc-security-group-ids $DB_SG_ID \
    --db-subnet-group-name "${PROJECT_NAME}-${ENVIRONMENT}-db-subnet-group" \
    --backup-retention-period 7 \
    --storage-encrypted \
    --no-multi-az \
    --no-publicly-accessible

print_status "Waiting for RDS instance to be available (this may take 10-15 minutes)..."

# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier "${PROJECT_NAME}-${ENVIRONMENT}-db"

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier "${PROJECT_NAME}-${ENVIRONMENT}-db" --query 'DBInstances[0].Endpoint.Address' --output text)

print_success "RDS Database created: $DB_ENDPOINT"

# Step 6: Launch EC2 Instance
print_step "6" "Launching EC2 Instance"

# Get latest Amazon Linux 2 AMI
AMI_ID=$(aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' --output text)

# Create user data script
cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y git docker postgresql

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Create application directory
mkdir -p /opt/threat-intel
chown ec2-user:ec2-user /opt/threat-intel
EOF

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $WEB_SG_ID \
    --subnet-id $SUBNET_PUBLIC_ID \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-${ENVIRONMENT}-web}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

print_status "Waiting for EC2 instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

print_success "EC2 Instance created: $PUBLIC_IP"

# Step 7: Deploy Application
print_step "7" "Deploying Application to EC2"

print_status "Waiting for EC2 instance to be fully initialized (2 minutes)..."
sleep 120

# Create deployment script
cat > deploy-to-ec2.sh << EOF
#!/bin/bash
set -e

# Clone repository (assuming you'll push your code to a repo)
cd /opt/threat-intel
git clone https://github.com/yourusername/threat-intel-app.git . || echo "Using local files"

# Install dependencies
npm install

# Create environment file
cat > .env << EOL
NODE_ENV=production
PORT=3000
DB_HOST=$DB_ENDPOINT
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
ABUSEIPDB_API_KEY=$ABUSEIPDB_KEY
VIRUSTOTAL_API_KEY=$VIRUSTOTAL_KEY
JWT_SECRET=\$(openssl rand -base64 32)
EOL

# Build application
npm run build

# Start with PM2
pm2 start npm --name "threat-intel" -- start
pm2 startup
pm2 save
EOF

# Copy files to EC2
print_status "Copying application files to EC2..."
scp -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no -r . ec2-user@$PUBLIC_IP:/tmp/app/
scp -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no deploy-to-ec2.sh ec2-user@$PUBLIC_IP:/tmp/

# Execute deployment
ssh -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP << EOF
sudo cp -r /tmp/app/* /opt/threat-intel/
sudo chown -R ec2-user:ec2-user /opt/threat-intel
chmod +x /tmp/deploy-to-ec2.sh
/tmp/deploy-to-ec2.sh
EOF

print_success "Application deployed to EC2"

# Step 8: Setup Database Schema
print_step "8" "Setting up Database Schema"

# Create database schema script
cat > setup-db.sql << EOF
-- Create tables for IP Threat Management System

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    assigned_categories TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'bg-blue-500',
    icon VARCHAR(50) DEFAULT 'Shield',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'ip',
    category_id UUID REFERENCES categories(id),
    description TEXT,
    added_by VARCHAR(50),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'manual',
    source_category VARCHAR(50),
    reputation JSONB,
    vt_reputation JSONB
);

CREATE TABLE IF NOT EXISTS whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'ip',
    description TEXT,
    added_by VARCHAR(50),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
INSERT INTO users (username, email, password, role, created_by) VALUES 
('admin', 'admin@company.com', 'password', 'superadmin', 'system')
ON CONFLICT (username) DO NOTHING;

INSERT INTO categories (name, label, description, color, icon, is_default, created_by) VALUES 
('malware', 'Malware IPs', 'Known malware command & control servers', 'bg-red-500', 'Bug', true, 'system'),
('phishing', 'Phishing IPs', 'Phishing campaign infrastructure', 'bg-orange-500', 'Mail', true, 'system'),
('c2', 'C2 IPs', 'Command & control servers', 'bg-purple-500', 'Server', true, 'system'),
('bruteforce', 'Bruteforce IPs', 'Brute force attack sources', 'bg-yellow-500', 'Zap', true, 'system'),
('sources', 'Source Intelligence', 'Threat intelligence from external sources', 'bg-indigo-500', 'Database', true, 'system')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ip_entries_category ON ip_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_ip_entries_ip ON ip_entries(ip);
CREATE INDEX IF NOT EXISTS idx_whitelist_ip ON whitelist(ip);
EOF

# Execute database setup
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U postgres -d postgres -f setup-db.sql

print_success "Database schema created"

# Cleanup
rm -f user-data.sh deploy-to-ec2.sh setup-db.sql

# Final output
echo ""
echo "=========================================="
echo "   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
print_success "📋 Your IP Threat Management System is now live!"
echo ""
print_success "🌐 Application URL: http://$PUBLIC_IP:3000"
print_success "🖥️  EC2 Instance: $INSTANCE_ID ($PUBLIC_IP)"
print_success "🗄️  RDS Database: $DB_ENDPOINT"
echo ""
print_success "🔐 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: password"
echo ""
print_success "🔑 SSH Access:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
echo ""
print_success "💰 Estimated Monthly Cost: $15-25"
echo "   - EC2 t3.micro: $8-10"
echo "   - RDS db.t3.micro: $12-15"
echo "   - Data transfer: $1-2"
echo ""
print_success "📝 Next Steps:"
echo "   1. Access your application at: http://$PUBLIC_IP:3000"
echo "   2. Login with the default credentials"
echo "   3. Change the default password"
echo "   4. Set up SSL certificate (optional)"
echo "   5. Configure domain name (optional)"
echo ""
print_success "🛡️ Your threat intelligence system is ready!"