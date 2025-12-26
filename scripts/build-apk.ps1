# Quick script to build Android APK
# Usage: .\scripts\build-apk.ps1 [development|preview|production]

param(
    [ValidateSet('development', 'preview', 'production')]
    [string]$profile = 'development'
)

Write-Host "🏗️ Building Android APK..." -ForegroundColor Cyan
Write-Host "Profile: $profile" -ForegroundColor Yellow
Write-Host ""

# Check if EAS CLI is installed
if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
}

Write-Host "This will take about 15-20 minutes..." -ForegroundColor Yellow
Write-Host ""

# Build the APK
eas build --platform android --profile $profile

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "Download link will be available in the EAS dashboard." -ForegroundColor Green
Write-Host "Visit: https://expo.dev" -ForegroundColor Cyan
