# 🚀 EC2 + RDS Deployment Guide

Complete guide for deploying the IP Threat Management System on AWS EC2 with RDS PostgreSQL database.

## 📋 Overview

This deployment creates:
- **EC2 Instance** running the Node.js application
- **RDS PostgreSQL Database** for persistent storage
- **VPC with proper networking** (public/private subnets)
- **Security Groups** with appropriate rules
- **Complete application setup** with PM2 process manager

## 💰 Cost Estimation

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| **EC2** | t3.micro | $8-10 |
| **RDS** | db.t3.micro | $12-15 |
| **Storage** | 20GB GP2 | $2-3 |
| **Data Transfer** | Normal usage | $1-2 |
| **Total** | | **$23-30/month** |

## 🚀 Quick Deployment

### **Single Command:**
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

### **What You'll Need:**
- AWS CLI configured
- AbuseIPDB API key
- VirusTotal API key
- Database password

## 🏗️ Architecture

```
Internet
    |
Internet Gateway
    |
Public Subnet (10.0.1.0/24)
    |
EC2 Instance (Web Server)
    |
Private Subnet (10.0.2.0/24)
    |
RDS PostgreSQL Database
```

## 📦 What Gets Created

### **Network Infrastructure:**
- **VPC** (10.0.0.0/16)
- **Public Subnet** (10.0.1.0/24) - for EC2
- **Private Subnet** (10.0.2.0/24) - for RDS
- **Internet Gateway** - for public access
- **Route Tables** - for traffic routing
- **Security Groups** - for firewall rules

### **Compute Resources:**
- **EC2 Instance** (t3.micro by default)
  - Amazon Linux 2
  - Node.js 18
  - PM2 process manager
  - Docker (for future use)
- **RDS PostgreSQL** (db.t3.micro by default)
  - 20GB storage
  - Automated backups
  - Encryption at rest

### **Application Setup:**
- **Node.js Application** with all dependencies
- **PostgreSQL Database** with schema
- **Environment Variables** configured
- **PM2 Process Manager** for auto-restart
- **Default Data** (admin user, categories)

## 🔧 Manual Deployment Steps

If you prefer manual setup:

### **1. Prerequisites**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS
aws configure
```

### **2. Create Infrastructure**
```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)

# Create Subnets
SUBNET_ID=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --query 'Subnet.SubnetId' --output text)

# Create Security Group
SG_ID=$(aws ec2 create-security-group --group-name web-sg --description "Web Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)

# Add security group rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3000 --cidr 0.0.0.0/0
```

### **3. Launch EC2**
```bash
# Create key pair
aws ec2 create-key-pair --key-name my-key --query 'KeyMaterial' --output text > my-key.pem
chmod 400 my-key.pem

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0abcdef1234567890 \
    --count 1 \
    --instance-type t3.micro \
    --key-name my-key \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --query 'Instances[0].InstanceId' \
    --output text)
```

### **4. Create RDS Database**
```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier my-database \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password mypassword \
    --allocated-storage 20
```

### **5. Deploy Application**
```bash
# Get EC2 public IP
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

# SSH to EC2 and setup
ssh -i my-key.pem ec2-user@$PUBLIC_IP

# On EC2 instance:
sudo yum update -y
sudo yum install -y git nodejs npm postgresql

# Clone and setup application
git clone <your-repo-url>
cd threat-intel-app
npm install
npm run build

# Install PM2 and start
sudo npm install -g pm2
pm2 start npm --name "threat-intel" -- start
pm2 startup
pm2 save
```

## 🔒 Security Configuration

### **Security Groups:**

**Web Security Group (EC2):**
- Port 22 (SSH) - Your IP only (recommended)
- Port 80 (HTTP) - 0.0.0.0/0
- Port 443 (HTTPS) - 0.0.0.0/0
- Port 3000 (App) - 0.0.0.0/0

**Database Security Group (RDS):**
- Port 5432 (PostgreSQL) - Web Security Group only

### **Best Practices:**
- ✅ **RDS in private subnet** (not publicly accessible)
- ✅ **Security groups** instead of NACLs
- ✅ **Encrypted storage** for RDS
- ✅ **Regular backups** enabled
- ✅ **SSH key authentication** only

## 🔧 Configuration

### **Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
ABUSEIPDB_API_KEY=your-key
VIRUSTOTAL_API_KEY=your-key
JWT_SECRET=your-jwt-secret
```

### **Database Schema:**
The deployment automatically creates:
- **users** table - User management
- **categories** table - Threat categories
- **ip_entries** table - IP threat data
- **whitelist** table - Whitelisted IPs

## 🚀 Post-Deployment

### **1. Access Application:**
```
http://your-ec2-public-ip:3000
```

### **2. Default Login:**
- Username: `admin`
- Password: `password`

### **3. SSH Access:**
```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### **4. Application Management:**
```bash
# Check status
pm2 status

# View logs
pm2 logs threat-intel

# Restart application
pm2 restart threat-intel

# Stop application
pm2 stop threat-intel
```

## 🔄 Updates & Maintenance

### **Update Application:**
```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Pull latest changes
cd /opt/threat-intel
git pull origin main

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart threat-intel
```

### **Database Backup:**
```bash
# Manual backup
pg_dump -h your-rds-endpoint -U postgres -d postgres > backup.sql

# Automated backups are enabled by default (7 days retention)
```

### **Monitor Resources:**
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top

# Check application logs
pm2 logs threat-intel
```

## 🌐 Optional: Domain & SSL

### **1. Domain Setup:**
- Point your domain to EC2 public IP
- Update security groups if needed

### **2. SSL Certificate:**
```bash
# Install Certbot
sudo yum install -y certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx (optional)
sudo yum install -y nginx
# Configure SSL in Nginx
```

## 🆘 Troubleshooting

### **Common Issues:**

**Application won't start:**
```bash
# Check logs
pm2 logs threat-intel

# Check environment variables
cat /opt/threat-intel/.env

# Restart PM2
pm2 restart threat-intel
```

**Database connection issues:**
```bash
# Test database connection
psql -h your-rds-endpoint -U postgres -d postgres

# Check security groups
aws ec2 describe-security-groups --group-ids your-db-sg-id
```

**Can't access application:**
```bash
# Check if application is running
pm2 status

# Check security groups
aws ec2 describe-security-groups --group-ids your-web-sg-id

# Check if port 3000 is open
sudo netstat -tlnp | grep 3000
```

## 💡 Optimization Tips

### **Performance:**
- Use **t3.small** or larger for production
- Enable **RDS Multi-AZ** for high availability
- Use **Application Load Balancer** for multiple instances
- Implement **CloudFront CDN** for static assets

### **Cost Optimization:**
- Use **Reserved Instances** for long-term deployments
- Enable **RDS storage autoscaling**
- Set up **CloudWatch alarms** for resource monitoring
- Use **Spot Instances** for development environments

### **Security:**
- Restrict SSH access to your IP only
- Use **AWS Systems Manager Session Manager** instead of SSH
- Enable **VPC Flow Logs**
- Set up **AWS Config** for compliance monitoring

## 🎯 Next Steps

After successful deployment:

1. **Change default password** immediately
2. **Create additional users** as needed
3. **Configure threat intelligence sources**
4. **Set up monitoring and alerting**
5. **Plan backup and disaster recovery**
6. **Consider implementing CI/CD pipeline**

Your IP Threat Management System is now running on AWS with full database functionality! 🛡️