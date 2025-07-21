@echo off
echo.
echo ========================================
echo   🔐 AWS PERMISSIONS FIX GUIDE
echo ========================================
echo.

echo The SAM deployment failed due to insufficient AWS permissions.
echo Your AWS user needs additional permissions to create resources.
echo.

echo 📋 SOLUTIONS:
echo.

echo Option 1: Add Administrator Access (Easiest)
echo ============================================
echo 1. Go to: https://console.aws.amazon.com/iam/
echo 2. Click "Users" in the left menu
echo 3. Find and click your username
echo 4. Click "Permissions" tab
echo 5. Click "Add permissions" → "Attach policies directly"
echo 6. Search for "AdministratorAccess"
echo 7. Check the box and click "Add permissions"
echo.

echo Option 2: Add Specific Permissions (More Secure)
echo ================================================
echo Attach these AWS managed policies to your user:
echo - CloudFormationFullAccess
echo - IAMFullAccess
echo - AWSLambda_FullAccess
echo - AmazonDynamoDBFullAccess
echo - AmazonAPIGatewayAdministrator
echo - AmazonS3FullAccess
echo - CloudFrontFullAccess
echo - SecretsManagerReadWrite
echo.

echo Option 3: Use Different AWS Account
echo ===================================
echo If you can't modify permissions:
echo 1. Create new AWS account (free tier)
echo 2. Run: aws configure
echo 3. Enter new account credentials
echo 4. Retry deployment
echo.

echo ========================================
echo   🚀 AFTER FIXING PERMISSIONS
echo ========================================
echo.

echo Run these commands:
echo 1. sam build
echo 2. sam deploy --guided
echo.

echo Or use the complete deployment script:
echo deploy-complete-aws.bat
echo.

pause