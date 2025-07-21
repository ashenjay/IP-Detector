@echo off
REM Windows Batch Script for AWS Deployment
echo 🚀 Starting AWS Deployment for Windows...

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed. Please install it first.
    echo Download from: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

REM Check if SAM CLI is installed
sam --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SAM CLI is not installed. Please install it first.
    echo Install with: pip install aws-sam-cli
    pause
    exit /b 1
)

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured. Please run 'aws configure'
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!

REM Get API keys from user
set /p ABUSEIPDB_KEY="Enter your AbuseIPDB API key: "
set /p VIRUSTOTAL_KEY="Enter your VirusTotal API key: "

if "%ABUSEIPDB_KEY%"=="" (
    echo ❌ AbuseIPDB API key is required!
    pause
    exit /b 1
)

if "%VIRUSTOTAL_KEY%"=="" (
    echo ❌ VirusTotal API key is required!
    pause
    exit /b 1
)

REM Set environment (default to dev)
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

echo 📦 Deploying to environment: %ENVIRONMENT%

REM Install dependencies for Lambda functions
echo 📦 Installing Lambda function dependencies...

if exist "src\lambda\auth" (
    cd src\lambda\auth
    call npm install --production
    cd ..\..\..
)

if exist "src\lambda\ip-entries" (
    cd src\lambda\ip-entries
    call npm install --production
    cd ..\..\..
)

echo ✅ Dependencies installed!

REM Build the SAM application
echo 🔨 Building SAM application...
call sam build

if %errorlevel% neq 0 (
    echo ❌ SAM build failed!
    pause
    exit /b 1
)

echo ✅ SAM build completed!

REM Deploy the application
echo 🚀 Deploying SAM application...
call sam deploy --guided --parameter-overrides Environment=%ENVIRONMENT% AbuseIPDBKey=%ABUSEIPDB_KEY% VirusTotalKey=%VIRUSTOTAL_KEY%

if %errorlevel% neq 0 (
    echo ❌ SAM deployment failed!
    pause
    exit /b 1
)

echo ✅ SAM deployment completed!

REM Build and deploy frontend
echo 🔨 Building frontend application...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo ✅ Frontend built successfully!

echo 🎉 Deployment completed successfully!
echo.
echo 📋 Next Steps:
echo 1. Check AWS CloudFormation console for stack outputs
echo 2. Get your CloudFront URL from the stack outputs
echo 3. Access your application
echo.
pause