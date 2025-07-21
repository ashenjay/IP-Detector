@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   🚀 SIMPLE AWS DEPLOYMENT
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

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed!
    pause
    exit /b 1
)
echo ✅ npm found

REM Check AWS CLI
echo.
echo Checking AWS CLI...
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI is not installed!
    echo.
    echo Please install AWS CLI:
    echo 1. Download from: https://aws.amazon.com/cli/
    echo 2. Or run: winget install Amazon.AWSCLI
    echo.
    pause
    exit /b 1
)
echo ✅ AWS CLI found

REM Check AWS credentials
echo.
echo Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured!
    echo.
    echo Please configure AWS credentials:
    echo Run: aws configure
    echo.
    echo You need:
    echo - AWS Access Key ID
    echo - AWS Secret Access Key
    echo - Default region (e.g., us-east-1)
    echo.
    pause
    exit /b 1
)
echo ✅ AWS credentials configured

REM Check SAM CLI
echo.
echo Checking SAM CLI...
sam --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SAM CLI is not installed!
    echo.
    echo Installing SAM CLI...
    pip install aws-sam-cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install SAM CLI
        echo Please install Python and pip first
        echo Then run: pip install aws-sam-cli
        pause
        exit /b 1
    )
)
echo ✅ SAM CLI ready

echo.
echo ========================================
echo   📋 READY TO DEPLOY
echo ========================================
echo.

REM Get API keys
set /p ABUSEIPDB_KEY="Enter AbuseIPDB API key (or press Enter to skip): "
set /p VIRUSTOTAL_KEY="Enter VirusTotal API key (or press Enter to skip): "

echo.
echo Starting deployment...
echo.

REM Install dependencies
echo Installing project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Build SAM application
echo.
echo Building SAM application...
call sam build
if %errorlevel% neq 0 (
    echo ❌ SAM build failed
    pause
    exit /b 1
)

REM Deploy SAM application
echo.
echo Deploying to AWS...
if "%ABUSEIPDB_KEY%"=="" (
    call sam deploy --guided
) else (
    call sam deploy --guided --parameter-overrides Environment=dev AbuseIPDBKey=%ABUSEIPDB_KEY% VirusTotalKey=%VIRUSTOTAL_KEY%
)

if %errorlevel% neq 0 (
    echo ❌ SAM deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   🎉 DEPLOYMENT COMPLETED!
echo ========================================
echo.
echo Check AWS CloudFormation console for:
echo - API Gateway endpoint
echo - CloudFront URL
echo - S3 bucket name
echo.
echo Default login: admin / password
echo.
pause