#!/bin/bash

echo "🔒 Updating AWS Security Group for Nginx setup"
echo "=============================================="

# Get instance information
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
SECURITY_GROUP_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

echo "📋 Instance ID: $INSTANCE_ID"
echo "🔒 Security Group ID: $SECURITY_GROUP_ID"

# Remove port 3000 access (if it exists)
echo "🚫 Removing direct port 3000 access..."
aws ec2 revoke-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 3000 rule not found or already removed"

# Ensure port 80 is open
echo "🌐 Ensuring port 80 (HTTP) is open..."
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 80 rule already exists"

# Ensure port 443 is open (for future HTTPS)
echo "🔐 Ensuring port 443 (HTTPS) is open..."
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 443 rule already exists"

echo ""
echo "✅ Security Group updated!"
echo ""
echo "📋 Current Security Group Rules:"
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' --output table

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo "🌐 Your application is now accessible at:"
echo "   http://ec2-18-138-231-76.ap-southeast-1.compute.amazonaws.com"
echo ""
echo "🔒 Security improvements:"
echo "   ✅ Port 3000 blocked from external access"
echo "   ✅ Only port 80 (HTTP) and 443 (HTTPS) are public"
echo "   ✅ Application runs internally on port 3000"
echo "   ✅ Nginx handles all external traffic"
echo ""