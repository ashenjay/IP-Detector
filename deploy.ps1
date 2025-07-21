# PowerShell Deployment Script for Windows
param(
    [string]$Environment = "dev"
)

Write-Host "🚀 Starting AWS Deployment (PowerShell)" -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if SAM CLI is installed
try {
    sam --version | Out-Null
    Write-Host "✅ SAM CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ SAM CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Install with: pip install aws-sam-cli" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS credentials not configured. Please run 'aws configure'" -ForegroundColor Red
    exit 1
}

# Get API keys
$AbuseIPDBKey = Read-Host "Enter your AbuseIPDB API key"
$VirusTotalKey = Read-Host "Enter your VirusTotal API key"

if ([string]::IsNullOrEmpty($AbuseIPDBKey) -or [string]::IsNullOrEmpty($VirusTotalKey)) {
    Write-Host "❌ Both API keys are required!" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Deploying to environment: $Environment" -ForegroundColor Blue

# Install Lambda dependencies
Write-Host "📦 Installing Lambda function dependencies..." -ForegroundColor Blue

if (Test-Path "src\lambda\auth") {
    Set-Location "src\lambda\auth"
    npm install --production
    Set-Location "..\..\..\"
}

if (Test-Path "src\lambda\ip-entries") {
    Set-Location "src\lambda\ip-entries"
    npm install --production
    Set-Location "..\..\..\"
}

Write-Host "✅ Dependencies installed!" -ForegroundColor Green

# Build SAM application
Write-Host "🔨 Building SAM application..." -ForegroundColor Blue
sam build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SAM build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SAM build completed!" -ForegroundColor Green

# Deploy SAM application
Write-Host "🚀 Deploying SAM application..." -ForegroundColor Blue
sam deploy --guided --parameter-overrides "Environment=$Environment" "AbuseIPDBKey=$AbuseIPDBKey" "VirusTotalKey=$VirusTotalKey"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SAM deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ SAM deployment completed!" -ForegroundColor Green

# Build frontend
Write-Host "🔨 Building frontend application..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check AWS CloudFormation console for stack outputs"
Write-Host "2. Get your CloudFront URL from the stack outputs"
Write-Host "3. Access your application"
Write-Host ""