# FileFlow Firestore Auto-Setup
# Run this script to deploy everything automatically

Write-Host "=== FileFlow Firestore Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to Firebase
Write-Host "[1/4] Logging in to Firebase..." -ForegroundColor Yellow
firebase login --no-localhost
if ($LASTEXITCODE -ne 0) {
    Write-Host "Login failed. Try again." -ForegroundColor Red
    exit 1
}

# Step 2: Deploy Firestore Rules
Write-Host "[2/4] Deploying Firestore security rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules --project file2flow
if ($LASTEXITCODE -ne 0) {
    Write-Host "Firestore rules deploy failed." -ForegroundColor Red
    exit 1
}

# Step 3: Deploy Firestore Indexes
Write-Host "[3/4] Deploying Firestore indexes..." -ForegroundColor Yellow
firebase deploy --only firestore:indexes --project file2flow
if ($LASTEXITCODE -ne 0) {
    Write-Host "Firestore indexes deploy failed." -ForegroundColor Red
    exit 1
}

# Step 4: Deploy Storage Rules
Write-Host "[4/4] Deploying Storage rules..." -ForegroundColor Yellow
firebase deploy --only storage --project file2flow
if ($LASTEXITCODE -ne 0) {
    Write-Host "Storage rules deploy failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Firestore rules, indexes, and storage rules are deployed." -ForegroundColor Green
Write-Host ""
Write-Host "TTL is configured in the code (expiresAt field on conversions)." -ForegroundColor Cyan
Write-Host "To enable TTL in Firebase Console:" -ForegroundColor Cyan
Write-Host "  1. Go to Firestore > Indexes > TTL tab" -ForegroundColor White
Write-Host "  2. Add policy: collection=conversions, field=expiresAt" -ForegroundColor White
