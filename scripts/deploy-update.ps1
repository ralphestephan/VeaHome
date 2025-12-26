# Quick script to deploy an EAS update
# Usage: .\scripts\deploy-update.ps1 "Your update message"

param(
    [string]$message = "Update deployed",
    [string]$branch = "development"
)

Write-Host "🚀 Publishing EAS Update..." -ForegroundColor Cyan
Write-Host "Branch: $branch" -ForegroundColor Yellow
Write-Host "Message: $message" -ForegroundColor Yellow
Write-Host ""

# Check if EAS CLI is installed
if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
}

# Publish the update
eas update --branch $branch --message $message

Write-Host ""
Write-Host "✅ Update published successfully!" -ForegroundColor Green
Write-Host "Users will receive the update next time they open the app." -ForegroundColor Green
