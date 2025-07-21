# 🚀 Deployment Guide

## Windows Users

### Option 1: Use Windows Batch Script
```cmd
deploy-windows.bat dev
```

### Option 2: Use Git Bash or WSL
```bash
# In Git Bash or WSL
chmod +x deploy.sh
./deploy.sh dev
```

### Option 3: Use PowerShell
```powershell
# Install AWS CLI
winget install Amazon.AWSCLI

# Install SAM CLI
pip install aws-sam-cli

# Configure AWS
aws configure

# Run deployment
powershell -ExecutionPolicy Bypass -File deploy.ps1 dev
```

## Linux/Mac Users

```bash
chmod +x deploy.sh
./deploy.sh dev
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **SAM CLI** installed
4. **Node.js** and npm installed
5. **API Keys**:
   - AbuseIPDB API key
   - VirusTotal API key

## Quick Setup

### 1. Install AWS CLI
**Windows:**
```cmd
winget install Amazon.AWSCLI
```

**Mac:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2. Install SAM CLI
```bash
pip install aws-sam-cli
```

### 3. Configure AWS
```bash
aws configure
```

### 4. Get API Keys
- **AbuseIPDB**: https://www.abuseipdb.com/api
- **VirusTotal**: https://www.virustotal.com/gui/join-us

### 5. Deploy
**Windows:**
```cmd
deploy-windows.bat dev
```

**Linux/Mac:**
```bash
./deploy.sh dev
```

## Troubleshooting

### "deploy.sh is not recognized"
- **Solution**: Use `deploy-windows.bat` instead
- **Or**: Install Git Bash and run `bash deploy.sh dev`

### "Permission denied"
```bash
chmod +x deploy.sh
./deploy.sh dev
```

### "AWS CLI not found"
- Install AWS CLI using the instructions above
- Restart your terminal

### "SAM CLI not found"
```bash
pip install aws-sam-cli
```

## Environment Options

- `dev` - Development environment
- `staging` - Staging environment  
- `prod` - Production environment

Example:
```bash
./deploy.sh prod
```