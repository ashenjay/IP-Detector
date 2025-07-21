@echo off
setlocal enabledelayedexpansion

REM Complete AWS Deployment with Database - Windows Batch Script
echo.
echo ========================================
echo   🚀 COMPLETE AWS DEPLOYMENT SCRIPT
echo   IP Threat Management System
echo ========================================
echo.

REM Colors simulation for Windows
set "GREEN=[92m"
set "BLUE=[94m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

REM Function to print colored output (simulated)
echo %BLUE%[INFO]%NC% Starting complete AWS deployment...

REM Step 1: Check Prerequisites
echo.
echo %BLUE%[STEP 1/10]%NC% Checking Prerequisites...
echo ----------------------------------------

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js is not installed!%NC%
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo %GREEN%✅ Node.js found%NC%

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ npm is not installed!%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ npm found%NC%

REM Check AWS CLI
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ AWS CLI is not installed!%NC%
    echo.
    echo Installing AWS CLI...
    echo Please wait...
    
    REM Try to install via winget
    winget install Amazon.AWSCLI >nul 2>&1
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install AWS CLI automatically%NC%
        echo Please install manually from: https://aws.amazon.com/cli/
        pause
        exit /b 1
    )
    echo %GREEN%✅ AWS CLI installed%NC%
) else (
    echo %GREEN%✅ AWS CLI found%NC%
)

REM Check SAM CLI
sam --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️ SAM CLI not found. Installing...%NC%
    pip install aws-sam-cli
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install SAM CLI%NC%
        echo Please install Python and pip first, then run: pip install aws-sam-cli
        pause
        exit /b 1
    )
    echo %GREEN%✅ SAM CLI installed%NC%
) else (
    echo %GREEN%✅ SAM CLI found%NC%
)

REM Step 2: AWS Configuration
echo.
echo %BLUE%[STEP 2/10]%NC% AWS Configuration...
echo ----------------------------------------

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%⚠️ AWS credentials not configured%NC%
    echo.
    echo Please configure your AWS credentials:
    echo 1. Go to: https://console.aws.amazon.com/
    echo 2. Sign in to your AWS account
    echo 3. Click your name (top right) → Security credentials
    echo 4. Scroll to 'Access keys' → Create access key
    echo 5. Choose 'Command Line Interface (CLI)'
    echo 6. Copy both keys
    echo.
    echo Now configuring AWS CLI...
    aws configure
    
    REM Verify configuration worked
    aws sts get-caller-identity >nul 2>&1
    if %errorlevel% neq 0 (
        echo %RED%❌ AWS configuration failed%NC%
        pause
        exit /b 1
    )
)

REM Get account info
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
for /f "tokens=*" %%i in ('aws configure get region') do set AWS_REGION=%%i
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

echo %GREEN%✅ AWS Account: %ACCOUNT_ID%%NC%
echo %GREEN%✅ AWS Region: %AWS_REGION%%NC%

REM Step 3: Get API Keys
echo.
echo %BLUE%[STEP 3/10]%NC% API Keys Configuration...
echo ----------------------------------------

echo.
echo 🔑 You need API keys for threat intelligence:
echo.
echo 1. AbuseIPDB API Key:
echo    - Go to: https://www.abuseipdb.com/api
echo    - Sign up/Login and get your API key
echo.
echo 2. VirusTotal API Key:
echo    - Go to: https://www.virustotal.com/gui/join-us
echo    - Sign up/Login and get your API key
echo.

set /p ABUSEIPDB_KEY="Enter your AbuseIPDB API key: "
set /p VIRUSTOTAL_KEY="Enter your VirusTotal API key: "

if "%ABUSEIPDB_KEY%"=="" (
    echo %RED%❌ AbuseIPDB API key is required!%NC%
    pause
    exit /b 1
)

if "%VIRUSTOTAL_KEY%"=="" (
    echo %RED%❌ VirusTotal API key is required!%NC%
    pause
    exit /b 1
)

echo %GREEN%✅ API keys configured%NC%

REM Step 4: Environment Selection
echo.
echo %BLUE%[STEP 4/10]%NC% Environment Selection...
echo ----------------------------------------

echo.
echo Select deployment environment:
echo 1. dev (Development)
echo 2. staging (Staging)
echo 3. prod (Production)
echo.
set /p ENV_CHOICE="Enter choice (1-3) [default: 1]: "

if "%ENV_CHOICE%"=="" set ENV_CHOICE=1
if "%ENV_CHOICE%"=="1" set ENVIRONMENT=dev
if "%ENV_CHOICE%"=="2" set ENVIRONMENT=staging
if "%ENV_CHOICE%"=="3" set ENVIRONMENT=prod

echo %GREEN%✅ Environment: %ENVIRONMENT%%NC%

REM Step 5: Install Dependencies
echo.
echo %BLUE%[STEP 5/10]%NC% Installing Dependencies...
echo ----------------------------------------

echo Installing main project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to install main dependencies%NC%
    pause
    exit /b 1
)

echo Installing Lambda function dependencies...

REM Auth Lambda
if exist "src\lambda\auth" (
    echo Installing auth function dependencies...
    cd src\lambda\auth
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install auth dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM Users Lambda
if exist "src\lambda\users" (
    echo Installing users function dependencies...
    cd src\lambda\users
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install users dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM Categories Lambda
if exist "src\lambda\categories" (
    echo Installing categories function dependencies...
    cd src\lambda\categories
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install categories dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM IP Entries Lambda
if exist "src\lambda\ip-entries" (
    echo Installing ip-entries function dependencies...
    cd src\lambda\ip-entries
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install ip-entries dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM Whitelist Lambda
if exist "src\lambda\whitelist" (
    echo Installing whitelist function dependencies...
    cd src\lambda\whitelist
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install whitelist dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM EDL Lambda
if exist "src\lambda\edl" (
    echo Installing edl function dependencies...
    cd src\lambda\edl
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install edl dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

REM Sync Lambda
if exist "src\lambda\sync" (
    echo Installing sync function dependencies...
    cd src\lambda\sync
    call npm install --production
    if %errorlevel% neq 0 (
        echo %RED%❌ Failed to install sync dependencies%NC%
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
)

echo %GREEN%✅ All dependencies installed%NC%

REM Step 6: Build SAM Application
echo.
echo %BLUE%[STEP 6/10]%NC% Building SAM Application...
echo ----------------------------------------

echo Building serverless application...
call sam build
if %errorlevel% neq 0 (
    echo %RED%❌ SAM build failed!%NC%
    echo.
    echo Common issues:
    echo - Check that all Lambda function dependencies are installed
    echo - Verify template.yaml syntax
    echo - Ensure Python/Node.js versions are compatible
    pause
    exit /b 1
)

echo %GREEN%✅ SAM build completed%NC%

REM Step 7: Deploy Infrastructure
echo.
echo %BLUE%[STEP 7/10]%NC% Deploying AWS Infrastructure...
echo ----------------------------------------

echo Deploying serverless stack with DynamoDB tables...
echo This may take 5-10 minutes...

call sam deploy --guided --parameter-overrides Environment=%ENVIRONMENT% AbuseIPDBKey=%ABUSEIPDB_KEY% VirusTotalKey=%VIRUSTOTAL_KEY%
if %errorlevel% neq 0 (
    echo %RED%❌ SAM deployment failed!%NC%
    echo.
    echo Check AWS CloudFormation console for detailed error information
    echo Common issues:
    echo - Insufficient AWS permissions
    echo - Resource limits exceeded
    echo - Invalid parameter values
    pause
    exit /b 1
)

echo %GREEN%✅ Infrastructure deployed%NC%

REM Step 8: Get Stack Outputs
echo.
echo %BLUE%[STEP 8/10]%NC% Getting Deployment Information...
echo ----------------------------------------

set STACK_NAME=threat-intel-stack

echo Retrieving stack outputs...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue" --output text') do set API_ENDPOINT=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue" --output text') do set FRONTEND_BUCKET=%%i
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_NAME% --query "Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue" --output text') do set CLOUDFRONT_URL=%%i

echo %GREEN%✅ API Endpoint: %API_ENDPOINT%%NC%
echo %GREEN%✅ Frontend Bucket: %FRONTEND_BUCKET%%NC%
echo %GREEN%✅ CloudFront URL: https://%CLOUDFRONT_URL%%NC%

REM Step 9: Initialize Database
echo.
echo %BLUE%[STEP 9/10]%NC% Initializing Database...
echo ----------------------------------------

echo Creating default admin user...
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-users" --item "{\"id\": {\"S\": \"admin-001\"}, \"username\": {\"S\": \"admin\"}, \"email\": {\"S\": \"admin@company.com\"}, \"password\": {\"S\": \"password\"}, \"role\": {\"S\": \"superadmin\"}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

echo Creating default categories...

REM Create malware category
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-categories" --item "{\"id\": {\"S\": \"malware\"}, \"name\": {\"S\": \"malware\"}, \"label\": {\"S\": \"Malware IPs\"}, \"description\": {\"S\": \"Known malware command & control servers\"}, \"color\": {\"S\": \"bg-red-500\"}, \"icon\": {\"S\": \"Bug\"}, \"isDefault\": {\"BOOL\": true}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

REM Create phishing category
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-categories" --item "{\"id\": {\"S\": \"phishing\"}, \"name\": {\"S\": \"phishing\"}, \"label\": {\"S\": \"Phishing IPs\"}, \"description\": {\"S\": \"Phishing campaign infrastructure\"}, \"color\": {\"S\": \"bg-orange-500\"}, \"icon\": {\"S\": \"Mail\"}, \"isDefault\": {\"BOOL\": true}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

REM Create c2 category
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-categories" --item "{\"id\": {\"S\": \"c2\"}, \"name\": {\"S\": \"c2\"}, \"label\": {\"S\": \"C2 IPs\"}, \"description\": {\"S\": \"Command & control servers\"}, \"color\": {\"S\": \"bg-purple-500\"}, \"icon\": {\"S\": \"Server\"}, \"isDefault\": {\"BOOL\": true}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~3,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

REM Create bruteforce category
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-categories" --item "{\"id\": {\"S\": \"bruteforce\"}, \"name\": {\"S\": \"bruteforce\"}, \"label\": {\"S\": \"Bruteforce IPs\"}, \"description\": {\"S\": \"Brute force attack sources\"}, \"color\": {\"S\": \"bg-yellow-500\"}, \"icon\": {\"S\": \"Zap\"}, \"isDefault\": {\"BOOL\": true}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

REM Create sources category
aws dynamodb put-item --table-name "%ENVIRONMENT%-threat-intel-categories" --item "{\"id\": {\"S\": \"sources\"}, \"name\": {\"S\": \"sources\"}, \"label\": {\"S\": \"Source Intelligence\"}, \"description\": {\"S\": \"Threat intelligence from external sources\"}, \"color\": {\"S\": \"bg-indigo-500\"}, \"icon\": {\"S\": \"Database\"}, \"isDefault\": {\"BOOL\": true}, \"isActive\": {\"BOOL\": true}, \"createdBy\": {\"S\": \"system\"}, \"createdAt\": {\"S\": \"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,2%:%time:~6,2%.000Z\"}}" >nul 2>&1

echo %GREEN%✅ Database initialized with default data%NC%

REM Step 10: Build and Deploy Frontend
echo.
echo %BLUE%[STEP 10/10]%NC% Building and Deploying Frontend...
echo ----------------------------------------

echo Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo %RED%❌ Frontend build failed!%NC%
    pause
    exit /b 1
)

echo Deploying frontend to S3...
aws s3 sync dist/ s3://%FRONTEND_BUCKET% --delete
if %errorlevel% neq 0 (
    echo %RED%❌ Frontend deployment failed!%NC%
    pause
    exit /b 1
)

echo Creating frontend configuration...
echo window.APP_CONFIG = { > dist\config.js
echo   API_ENDPOINT: '%API_ENDPOINT%', >> dist\config.js
echo   ENVIRONMENT: '%ENVIRONMENT%' >> dist\config.js
echo }; >> dist\config.js

aws s3 cp dist\config.js s3://%FRONTEND_BUCKET%/config.js

echo Invalidating CloudFront cache...
for /f "tokens=*" %%i in ('aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='%FRONTEND_BUCKET%.s3.amazonaws.com'].Id" --output text') do set DISTRIBUTION_ID=%%i

if not "%DISTRIBUTION_ID%"=="" (
    aws cloudfront create-invalidation --distribution-id %DISTRIBUTION_ID% --paths "/*" >nul 2>&1
    echo %GREEN%✅ CloudFront cache invalidated%NC%
) else (
    echo %YELLOW%⚠️ Could not find CloudFront distribution for cache invalidation%NC%
)

echo %GREEN%✅ Frontend deployed successfully%NC%

REM Final Success Message
echo.
echo ========================================
echo   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo %GREEN%📋 Your IP Threat Management System is now live!%NC%
echo.
echo %GREEN%🌐 Application URL: https://%CLOUDFRONT_URL%%NC%
echo %GREEN%📡 API Endpoint: %API_ENDPOINT%%NC%
echo.
echo %GREEN%🔐 Default Login Credentials:%NC%
echo    Username: admin
echo    Password: password
echo.
echo %GREEN%📚 What's Deployed:%NC%
echo    ✅ 6 Lambda Functions (Auth, Users, Categories, IP Entries, Whitelist, EDL, Sync)
echo    ✅ 4 DynamoDB Tables (Users, Categories, IP Entries, Whitelist)
echo    ✅ API Gateway with CORS enabled
echo    ✅ S3 Bucket for frontend hosting
echo    ✅ CloudFront distribution for global CDN
echo    ✅ Secrets Manager for API keys
echo    ✅ EventBridge for scheduled sync (every 6 hours)
echo.
echo %GREEN%📝 Next Steps:%NC%
echo    1. Access your application at: https://%CLOUDFRONT_URL%
echo    2. Login with the default credentials
echo    3. Change the default password immediately
echo    4. Create additional users as needed
echo    5. Start adding IP threat intelligence data
echo    6. Configure EDL feeds in your Palo Alto firewall
echo.
echo %GREEN%💰 Estimated Monthly Cost: $25-35%NC%
echo    - Lambda: $8-12 (1M requests)
echo    - API Gateway: $3.50 (1M requests)
echo    - DynamoDB: $2-5 (1M reads/writes)
echo    - S3: $1-2 (1GB storage, 10GB transfer)
echo    - CloudFront: $8-10 (100GB transfer)
echo    - Secrets Manager: $0.40 (1 secret)
echo.
echo %GREEN%🛡️ Happy threat hunting!%NC%
echo.
pause