@echo off
echo.
echo ========================================
echo   📋 STEP-BY-STEP DEPLOYMENT GUIDE
echo ========================================
echo.

echo Step 1: Install Prerequisites
echo =============================
echo.
echo 1. Install Node.js: https://nodejs.org/
echo 2. Install AWS CLI: https://aws.amazon.com/cli/
echo 3. Install SAM CLI: pip install aws-sam-cli
echo.

echo Step 2: Configure AWS
echo =====================
echo.
echo Run: aws configure
echo.
echo You need:
echo - AWS Access Key ID
echo - AWS Secret Access Key  
echo - Default region (e.g., us-east-1)
echo.

echo Step 3: Get API Keys
echo ====================
echo.
echo 1. AbuseIPDB: https://www.abuseipdb.com/api
echo 2. VirusTotal: https://www.virustotal.com/gui/join-us
echo.

echo Step 4: Deploy
echo ===============
echo.
echo 1. npm install
echo 2. sam build
echo 3. sam deploy --guided
echo.

echo Step 5: Build Frontend
echo ======================
echo.
echo 1. npm run build
echo 2. Upload dist/ folder to S3 bucket
echo.

echo ========================================
echo   Manual Commands:
echo ========================================
echo.
echo npm install
echo sam build
echo sam deploy --guided
echo npm run build
echo.

pause