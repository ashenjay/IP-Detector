@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   🚀 AWS DEPLOYMENT WITH PERMISSIONS CHECK
echo ========================================
echo.

REM Check AWS CLI
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI not found. Installing...
    winget install Amazon.AWSCLI
    if %errorlevel% neq 0 (
        echo Please install AWS CLI manually: https://aws.amazon.com/cli/
        pause
        exit /b 1
    )
)
echo ✅ AWS CLI found

REM Check AWS credentials
echo.
echo Checking AWS credentials...
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS credentials not configured
    echo Please run: aws configure
    pause
    exit /b 1
)
echo ✅ AWS credentials configured

REM Get user info
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Arn --output text') do set USER_ARN=%%i

echo.
echo 📋 AWS Account Info:
echo Account ID: %ACCOUNT_ID%
echo User: %USER_ARN%
echo.

REM Test permissions
echo 🔐 Testing AWS permissions...
echo.

echo Testing CloudFormation permissions...
aws cloudformation describe-stacks --region us-east-1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ CloudFormation access denied
    set PERMISSION_ERROR=1
) else (
    echo ✅ CloudFormation access OK
)

echo Testing IAM permissions...
aws iam list-roles --max-items 1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ IAM access denied
    set PERMISSION_ERROR=1
) else (
    echo ✅ IAM access OK
)

echo Testing Lambda permissions...
aws lambda list-functions --max-items 1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Lambda access denied
    set PERMISSION_ERROR=1
) else (
    echo ✅ Lambda access OK
)

if defined PERMISSION_ERROR (
    echo.
    echo ❌ PERMISSION ISSUES DETECTED!
    echo.
    echo 🔧 TO FIX:
    echo 1. Go to: https://console.aws.amazon.com/iam/
    echo 2. Find your user in "Users"
    echo 3. Add "AdministratorAccess" policy
    echo 4. Or run: fix-aws-permissions.bat
    echo.
    echo After fixing permissions, run this script again.
    pause
    exit /b 1
)

echo.
echo ✅ All permissions OK! Proceeding with deployment...
echo.

REM Check SAM CLI
sam --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing SAM CLI...
    pip install aws-sam-cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install SAM CLI
        echo Please install Python and pip first
        pause
        exit /b 1
    )
)
echo ✅ SAM CLI ready

REM Get API keys
echo.
echo 🔑 API Keys Setup:
set /p ABUSEIPDB_KEY="Enter AbuseIPDB API key (or press Enter to skip): "
set /p VIRUSTOTAL_KEY="Enter VirusTotal API key (or press Enter to skip): "

echo.
echo 🚀 Starting deployment...
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Build SAM
echo.
echo Building SAM application...
call sam build
if %errorlevel% neq 0 (
    echo ❌ SAM build failed
    pause
    exit /b 1
)

REM Deploy SAM
echo.
echo Deploying to AWS...
if "%ABUSEIPDB_KEY%"=="" (
    call sam deploy --guided
) else (
    call sam deploy --guided --parameter-overrides Environment=dev AbuseIPDBKey=%ABUSEIPDB_KEY% VirusTotalKey=%VIRUSTOTAL_KEY%
)

if %errorlevel% neq 0 (
    echo ❌ SAM deployment failed
    echo.
    echo This might be due to:
    echo 1. Insufficient permissions
    echo 2. Resource conflicts
    echo 3. Invalid parameters
    echo.
    echo Check the error above and try again.
    pause
    exit /b 1
)

echo.
echo ✅ Infrastructure deployed successfully!
echo.

REM Build frontend
echo Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
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
echo 🔗 AWS Console: https://console.aws.amazon.com/cloudformation/
echo.
pause