@echo off
echo.
echo ========================================
echo   🚀 SIMPLE S3 DEPLOYMENT (No Database)
echo   IP Threat Management System
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check AWS CLI
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed!
    echo.
    echo Installing AWS CLI...
    winget install Amazon.AWSCLI
    if %errorlevel% neq 0 (
        echo Please install AWS CLI manually from: https://aws.amazon.com/cli/
        pause
        exit /b 1
    )
)
echo ✅ AWS CLI found

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured!
    echo.
    echo Please configure AWS credentials:
    echo Run: aws configure
    echo.
    pause
    exit /b 1
)
echo ✅ AWS credentials configured

REM Get account info
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
for /f "tokens=*" %%i in ('aws configure get region') do set AWS_REGION=%%i
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

set BUCKET_NAME=abuse-ip-detector-%ACCOUNT_ID%-%RANDOM%

echo.
echo 📋 Deployment Info:
echo Account: %ACCOUNT_ID%
echo Region: %AWS_REGION%
echo Bucket: %BUCKET_NAME%
echo.

REM Create S3 bucket
echo 🪣 Creating S3 bucket...
aws s3 mb s3://%BUCKET_NAME% --region %AWS_REGION%
if %errorlevel% neq 0 (
    echo ❌ Failed to create S3 bucket
    pause
    exit /b 1
)

REM Configure bucket for website hosting
echo 🌐 Configuring website hosting...
aws s3 website s3://%BUCKET_NAME% --index-document index.html --error-document index.html

REM Create bucket policy for public access
echo 🔓 Setting up public access...
echo { > bucket-policy.json
echo   "Version": "2012-10-17", >> bucket-policy.json
echo   "Statement": [ >> bucket-policy.json
echo     { >> bucket-policy.json
echo       "Sid": "PublicReadGetObject", >> bucket-policy.json
echo       "Effect": "Allow", >> bucket-policy.json
echo       "Principal": "*", >> bucket-policy.json
echo       "Action": "s3:GetObject", >> bucket-policy.json
echo       "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" >> bucket-policy.json
echo     } >> bucket-policy.json
echo   ] >> bucket-policy.json
echo } >> bucket-policy.json

aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json
del bucket-policy.json

REM Install dependencies and build
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo 🔨 Building application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)

REM Deploy to S3
echo 🚀 Deploying to S3...
aws s3 sync dist/ s3://%BUCKET_NAME% --delete
if %errorlevel% neq 0 (
    echo ❌ Failed to deploy to S3
    pause
    exit /b 1
)

REM Get website URL
set WEBSITE_URL=http://%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com

echo.
echo ========================================
echo   🎉 DEPLOYMENT COMPLETED!
echo ========================================
echo.
echo 🌐 Website URL: %WEBSITE_URL%
echo 💰 Estimated cost: $1-3/month
echo.
echo 🔐 Demo Login Credentials:
echo    Username: admin
echo    Password: password
echo.
echo 📝 Features Available:
echo    ✅ IP threat management
echo    ✅ Category-based organization  
echo    ✅ User management (superadmin only)
echo    ✅ Whitelist management
echo    ✅ EDL feed generation
echo    ✅ AbuseIPDB integration (demo mode)
echo    ✅ VirusTotal integration (demo mode)
echo.
echo 📊 Data Storage: Browser Local Storage
echo 🔄 Data Persistence: Per browser/device
echo.

REM Optional CloudFront setup
echo.
set /p CREATE_CF="🌐 Create CloudFront distribution for HTTPS? (y/n): "
if /i "%CREATE_CF%"=="y" (
    echo.
    echo 🌩️ Creating CloudFront distribution...
    echo This will take 15-20 minutes to deploy globally.
    echo.
    
    echo { > cloudfront-config.json
    echo   "CallerReference": "abuse-ip-detector-%RANDOM%", >> cloudfront-config.json
    echo   "Comment": "Abuse IP Detector Distribution", >> cloudfront-config.json
    echo   "DefaultRootObject": "index.html", >> cloudfront-config.json
    echo   "Origins": { >> cloudfront-config.json
    echo     "Quantity": 1, >> cloudfront-config.json
    echo     "Items": [ >> cloudfront-config.json
    echo       { >> cloudfront-config.json
    echo         "Id": "S3-%BUCKET_NAME%", >> cloudfront-config.json
    echo         "DomainName": "%BUCKET_NAME%.s3-website-%AWS_REGION%.amazonaws.com", >> cloudfront-config.json
    echo         "CustomOriginConfig": { >> cloudfront-config.json
    echo           "HTTPPort": 80, >> cloudfront-config.json
    echo           "HTTPSPort": 443, >> cloudfront-config.json
    echo           "OriginProtocolPolicy": "http-only" >> cloudfront-config.json
    echo         } >> cloudfront-config.json
    echo       } >> cloudfront-config.json
    echo     ] >> cloudfront-config.json
    echo   }, >> cloudfront-config.json
    echo   "DefaultCacheBehavior": { >> cloudfront-config.json
    echo     "TargetOriginId": "S3-%BUCKET_NAME%", >> cloudfront-config.json
    echo     "ViewerProtocolPolicy": "redirect-to-https", >> cloudfront-config.json
    echo     "MinTTL": 0, >> cloudfront-config.json
    echo     "ForwardedValues": { >> cloudfront-config.json
    echo       "QueryString": false, >> cloudfront-config.json
    echo       "Cookies": { >> cloudfront-config.json
    echo         "Forward": "none" >> cloudfront-config.json
    echo       } >> cloudfront-config.json
    echo     } >> cloudfront-config.json
    echo   }, >> cloudfront-config.json
    echo   "Enabled": true, >> cloudfront-config.json
    echo   "PriceClass": "PriceClass_100" >> cloudfront-config.json
    echo } >> cloudfront-config.json
    
    for /f "tokens=*" %%i in ('aws cloudfront create-distribution --distribution-config file://cloudfront-config.json --query "Distribution.Id" --output text') do set DISTRIBUTION_ID=%%i
    del cloudfront-config.json
    
    echo ✅ CloudFront distribution created: %DISTRIBUTION_ID%
    echo 🌐 HTTPS URL will be: https://%DISTRIBUTION_ID%.cloudfront.net
    echo ⏱️ CloudFront deployment takes 15-20 minutes to complete
)

echo.
echo 🚀 Your Abuse IP Detector is now live!
echo 📱 Access it from any device with the URL above
echo 💾 Data is stored locally in each browser
echo.
pause