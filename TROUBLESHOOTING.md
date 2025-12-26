# Common Issues & Solutions

Quick fixes for common deployment problems.

## Build Issues

### ❌ "Command 'eas' not found"

**Solution:**
```powershell
npm install -g eas-cli
```

### ❌ Build fails with "Gradle build failed"

**Solution:**
```powershell
# Clear cache and rebuild
cd android
.\gradlew clean
cd ..
eas build --platform android --profile development --clear-cache
```

### ❌ "Not logged in"

**Solution:**
```powershell
eas login
# Use your Expo credentials
```

### ❌ "Build quota exceeded"

**Solution:**
- Free tier: 10 builds/month
- Wait until next month OR
- Upgrade to paid plan ($29/month)

Check usage:
```powershell
eas build:list
```

## Update Issues

### ❌ Update not appearing on device

**Checklist:**
1. Verify update published:
   ```powershell
   eas update:list --branch development
   ```

2. Check device has internet connection

3. Force close app completely:
   - Android: Settings → Apps → VeaHome → Force Stop
   - Or: Swipe away from recent apps

4. Reopen the app

5. Wait ~10 seconds on splash screen

**Still not working?**
```powershell
# Check update status
eas update:view [update-id]

# Publish again
eas update --branch development --message "Retry"
```

### ❌ "Runtime version mismatch"

**Cause:** Your build and update have different runtime versions.

**Solution:**
Build a new APK:
```powershell
npm run build:dev
```

Then reinstall on all devices.

### ❌ Update takes too long

**Check:**
- Is device on slow connection?
- Is update very large (> 5 MB)?

**Solution:**
- Optimize bundle size
- Compress images
- Remove unused dependencies

## Installation Issues

### ❌ "Can't install APK"

**Solution:**
1. Enable "Install from Unknown Sources":
   - Settings → Security → Unknown Sources → Enable

2. Or: Settings → Apps → Special Access → Install Unknown Apps → Chrome → Allow

### ❌ "App crashes on launch"

**Check:**
1. Is backend server running?
   ```powershell
   # Test backend
   curl http://63.34.243.171:8000/health
   ```

2. Check app logs:
   - Connect phone via USB
   - Run: `adb logcat | Select-String "ReactNativeJS"`

3. Rebuild with debug logs:
   ```powershell
   eas build --platform android --profile development
   ```

### ❌ "App installed but doesn't update"

**Solution:**
The installed app might be from a different build profile.

1. Uninstall the app completely
2. Download and install fresh APK from latest build
3. Verify:
   ```powershell
   eas build:list
   # Get the latest development build link
   ```

## Backend Connection Issues

### ❌ "Cannot connect to backend"

**Checklist:**
1. Backend running?
   ```powershell
   curl http://63.34.243.171:8000/health
   ```

2. AWS Security Group open?
   - Port 8000 should be open
   - Check AWS Console → EC2 → Security Groups

3. CORS configured?
   ```javascript
   // In backend server.ts
   app.use(cors({
     origin: '*', // Or specific origins
   }));
   ```

4. Correct URL in app?
   - Check app.json: `"apiBaseUrl": "http://63.34.243.171:8000"`

### ❌ "Socket.IO not connecting"

**Solution:**
```javascript
// Update socket connection in your app
const socket = io('http://63.34.243.171:8000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
});
```

## GitHub Actions Issues

### ❌ "EXPO_TOKEN not found"

**Solution:**
1. Get token: https://expo.dev/accounts/[your-account]/settings/access-tokens
2. Copy the token
3. GitHub repo → Settings → Secrets → Actions
4. Add secret: `EXPO_TOKEN` = [your-token]

### ❌ "GitHub Action failing"

**Check logs:**
1. Go to: GitHub repo → Actions tab
2. Click on failed workflow
3. Read error message

**Common fixes:**
```powershell
# Update EAS in workflow
# In .github/workflows/eas-update.yml
# Change eas-version: latest
```

## Permission Issues

### ❌ "Bluetooth not working"

**Verify in app.json:**
```json
"android": {
  "permissions": [
    "android.permission.BLUETOOTH",
    "android.permission.BLUETOOTH_SCAN",
    "android.permission.BLUETOOTH_CONNECT",
    "android.permission.ACCESS_FINE_LOCATION"
  ]
}
```

**Changed permissions?** → Rebuild APK

### ❌ "Network not accessible"

**Verify in app.json:**
```json
"android": {
  "usesCleartextTraffic": true,
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE"
  ]
}
```

## Verification Commands

### Check everything is configured:

```powershell
# EAS CLI installed?
eas --version

# Logged in?
eas whoami

# Project configured?
Get-Content app.json | Select-String "projectId"

# Builds status?
eas build:list --limit 5

# Updates status?
eas update:list --branch development --limit 5
```

## Getting Help

### 1. Check EAS Dashboard
https://expo.dev/accounts/[your-account]/projects/veahome

Shows:
- Build status and logs
- Update history
- Error reports

### 2. View Build Logs
```powershell
# List builds
eas build:list

# View specific build
eas build:view [build-id]
```

### 3. View Update Logs
```powershell
# List updates
eas update:list

# View specific update
eas update:view [update-id]
```

### 4. Check Local Logs
```powershell
# Connect phone via USB
# Enable USB debugging
# Run:
adb logcat *:E | Select-String "ReactNative"
```

### 5. Community Support
- Expo Discord: https://chat.expo.dev/
- Expo Forums: https://forums.expo.dev/
- Stack Overflow: Tag `expo`

## Quick Diagnostics

Run this to check your setup:

```powershell
Write-Host "🔍 VeaHome Deployment Diagnostics" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. EAS CLI:" -ForegroundColor Yellow
eas --version

Write-Host "`n2. Logged in:" -ForegroundColor Yellow
eas whoami

Write-Host "`n3. Recent builds:" -ForegroundColor Yellow
eas build:list --limit 3

Write-Host "`n4. Recent updates:" -ForegroundColor Yellow
eas update:list --branch development --limit 3

Write-Host "`n5. Backend status:" -ForegroundColor Yellow
try {
  Invoke-WebRequest -Uri "http://63.34.243.171:8000/health" -Method GET -TimeoutSec 5
  Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
  Write-Host "❌ Backend not accessible" -ForegroundColor Red
}

Write-Host "`n✅ Diagnostics complete!" -ForegroundColor Green
```

## Still Stuck?

### Create a detailed issue report:

```powershell
# Collect diagnostic info
eas build:list --limit 5 > diagnostics.txt
eas update:list --branch development --limit 5 >> diagnostics.txt
Get-Content package.json >> diagnostics.txt
Get-Content app.json >> diagnostics.txt

# Share diagnostics.txt when asking for help
```

### What to include when asking for help:
1. What command you ran
2. Full error message
3. Output of `eas build:list` or `eas update:list`
4. Screenshots of errors
5. Device info (Android version)

---

**Most issues are solved by:**
1. Running `eas login` again
2. Clearing cache: `eas build --clear-cache`
3. Rebuilding: `npm run build:dev`
4. Force closing app and reopening

**99% of problems fixed with these steps! 🎉**
