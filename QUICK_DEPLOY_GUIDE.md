# 🚀 Quick Start: Deploy VeaHome with Live Updates

## What You Get

✅ Android app that runs from anywhere  
✅ Instant updates without rebuilding  
✅ No need to keep your PC running  
✅ Team members can test changes live  

---

## Step-by-Step Guide

### 1️⃣ Install EAS CLI (One-time setup)

```powershell
npm install -g eas-cli
```

### 2️⃣ Login to Expo

```powershell
eas login
```

Use your Expo account or create one at https://expo.dev

### 3️⃣ Build Your First APK (Takes ~20 minutes)

```powershell
npm run build:dev
```

Or manually:
```powershell
eas build --platform android --profile development
```

**What happens:**
- EAS servers build your APK in the cloud
- You'll get a download link when done
- This APK can receive OTA updates!

### 4️⃣ Download & Install APK

1. After build completes, you'll get a link like: `https://expo.dev/accounts/.../builds/...`
2. Open this link on your Android device
3. Download the APK
4. Enable "Install from Unknown Sources" in Android settings
5. Install the APK

**Share this link with your team** so they can install too!

### 5️⃣ Make Changes & Deploy Updates

```powershell
# Make your code changes
# Then publish an instant update:

npm run update:dev
```

Or:
```powershell
eas update --branch development --message "Fixed login bug"
```

**Users get the update automatically** next time they open the app (or immediately if the app is open)!

---

## Daily Workflow

### Making Updates (No Rebuild Needed!)

```powershell
# 1. Edit your code
code src/screens/DashboardScreen.tsx

# 2. Publish update
npm run update:dev

# 3. Done! Users will get it instantly ✨
```

### Building New APK (Only when needed)

You only need to rebuild if you:
- Update native dependencies (like react-native-ble-plx)
- Change app permissions
- Update Expo SDK version

```powershell
npm run build:dev
```

---

## Automation (Optional but Recommended)

### Auto-deploy on Git Push

Already configured! Just push to GitHub:

```powershell
git add .
git commit -m "Updated dashboard UI"
git push origin main
```

GitHub Actions will automatically:
1. Publish EAS update
2. Comment on your commit with update link
3. Notify team members

**Setup required:**
1. Go to your GitHub repo settings → Secrets
2. Add `EXPO_TOKEN` secret
3. Get token from: https://expo.dev/accounts/[your-account]/settings/access-tokens

---

## Common Commands

```powershell
# Build commands
npm run build:dev        # Development build with debug features
npm run build:preview    # Preview build for testing
npm run build:prod       # Production build for Play Store

# Update commands
npm run update:dev       # Update development branch
npm run update:prod      # Update production branch

# Helper scripts
.\scripts\build-apk.ps1 development        # Build with script
.\scripts\deploy-update.ps1 "Bug fix"     # Deploy with message
```

---

## Managing Multiple Environments

### Development Branch (for testing)
```powershell
eas update --branch development
```

### Production Branch (for live users)
```powershell
eas update --branch production
```

Users install builds connected to specific branches.

---

## Costs

### Free Plan (Perfect for small teams)
- ✅ 10 builds per month
- ✅ Unlimited updates
- ✅ Up to 5 team members

### Paid Plan ($29/month)
- ✅ Unlimited builds
- ✅ Unlimited updates
- ✅ Priority builds

---

## Your Backend on AWS

Your backend is already on AWS at `http://63.34.243.171:8000`.

**Perfect setup:**
- 🎯 Backend on AWS (already done!)
- 🎯 App distribution via EAS (new!)
- 🎯 Live updates via EAS (new!)

No need to host Expo on AWS - let Expo handle that!

---

## Testing the Setup

### 1. Build and install APK (one time)
```powershell
npm run build:dev
# Wait 20 minutes, download APK, install on phone
```

### 2. Make a visible change
```typescript
// In src/screens/DashboardScreen.tsx
<Text>Testing EAS Update! v2</Text>
```

### 3. Deploy the update
```powershell
npm run update:dev
```

### 4. Check your phone
- Close and reopen the app
- You should see the new text!
- **No rebuild needed! 🎉**

---

## Troubleshooting

### "Build failed"
```powershell
# Check build logs
eas build:list

# Common fix: Clear cache
expo start -c
```

### "Update not appearing"
```powershell
# Force check for updates
# Close app completely, then reopen

# Check if update was published
eas update:list
```

### "Can't connect to backend"
- Verify AWS backend is running
- Check security group allows port 8000
- Update API URL in app.json if AWS IP changed

---

## Next Steps

1. ✅ Run `npm run build:dev` to create first build
2. ✅ Install APK on your test devices
3. ✅ Make a code change
4. ✅ Run `npm run update:dev` to deploy
5. ✅ See changes appear instantly!
6. ✅ Share APK link with your team

---

## Support

- 📚 Full guide: [EXPO_AWS_DEPLOYMENT.md](EXPO_AWS_DEPLOYMENT.md)
- 🌐 EAS Docs: https://docs.expo.dev/eas-update/introduction/
- 💬 Expo Discord: https://chat.expo.dev/

**You're all set to deploy with confidence! 🚀**
