# Deployment Checklist

Use this checklist to deploy VeaHome with live updates!

## 📋 Pre-Deployment Checklist

- [ ] EAS CLI installed (`eas --version` should work)
- [ ] Expo account created at https://expo.dev
- [ ] Git repository set up
- [ ] Backend running on AWS (already done ✅)

## 🚀 Initial Setup (One-Time)

### Step 1: Login to EAS
```powershell
eas login
```
- [ ] Logged in successfully

### Step 2: Configure EAS (Already Done ✅)
Your project already has:
- ✅ `eas.json` configured
- ✅ `app.json` with EAS updates
- ✅ Project ID: f9cd7fbd-1333-4d6e-8950-4fd7de75b966

### Step 3: Build Development APK
```powershell
npm run build:dev
```

**Expected:** Build starts on EAS servers (takes ~20 minutes)

- [ ] Build started successfully
- [ ] Build completed without errors
- [ ] Download link received

**Download link will look like:**
`https://expo.dev/accounts/[your-account]/projects/veahome/builds/[build-id]`

### Step 4: Test Installation

On your Android phone:
- [ ] Opened download link on phone
- [ ] Downloaded APK file
- [ ] Enabled "Install from Unknown Sources"
- [ ] Installed APK successfully
- [ ] App launches and works

### Step 5: Test First Update

Make a simple change:
```typescript
// In src/screens/DashboardScreen.tsx
// Add "- Testing OTA!" to a text element
```

Publish the update:
```powershell
npm run update:dev
```

- [ ] Update published successfully
- [ ] Closed and reopened app on phone
- [ ] Change appeared! 🎉

## 📱 Distribute to Team

### Share APK Link
The download link from Step 3 works for everyone:
- [ ] Shared link with team members
- [ ] Team members installed successfully
- [ ] Team members can see updates

### Create Distribution Page (Optional)
```powershell
# Build a preview version with more info
npm run build:preview
```

- [ ] Created preview build
- [ ] Shared with external testers

## 🔄 Set Up Automation (Optional but Recommended)

### GitHub Actions Setup

1. Go to: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - [ ] Created Expo access token
   - [ ] Copied token

2. Go to: GitHub repo → Settings → Secrets → Actions
   - [ ] Added secret `EXPO_TOKEN`
   - [ ] Pasted the token

3. Push to GitHub:
   ```powershell
   git add .
   git commit -m "Enable auto-deploy"
   git push origin main
   ```
   - [ ] GitHub Action ran successfully
   - [ ] Update auto-published

## ✅ Daily Workflow Checklist

### Making Code Changes

For each development session:

1. Make your changes
   - [ ] Code edited
   - [ ] Tested locally with `npm start`

2. Publish update
   ```powershell
   npm run update:dev
   ```
   - [ ] Update published (takes ~30 seconds)

3. Test on device
   - [ ] Closed and reopened app
   - [ ] Changes visible
   - [ ] No errors

### Pushing to Production

When ready for production release:

1. Merge to main branch
   ```powershell
   git checkout main
   git merge development
   git push origin main
   ```
   - [ ] Code merged

2. Publish to production
   ```powershell
   npm run update:prod
   ```
   - [ ] Production update published
   - [ ] End users notified (if using notifications)

## 🏗️ When to Rebuild APK

Rebuild only if you:
- [ ] Added/removed native dependencies
- [ ] Changed permissions in app.json
- [ ] Updated Expo SDK version
- [ ] Modified native code (android/ios folders)

**For JavaScript-only changes, just use `npm run update:dev`!**

## 🔍 Verification Checklist

### After Each Update

- [ ] Update published successfully
- [ ] No build errors
- [ ] App loads without crashes
- [ ] Backend API calls work
- [ ] Bluetooth functionality works (if changed)
- [ ] All screens accessible

### Weekly Health Check

- [ ] Check EAS build quota (10 builds/month on free tier)
- [ ] Review update history: https://expo.dev/accounts/[your-account]/projects/veahome/updates
- [ ] Check for any crash reports
- [ ] Verify all team members have latest version

## 🆘 Troubleshooting Checklist

### Build Failed
- [ ] Check build logs in EAS dashboard
- [ ] Verify all dependencies are compatible
- [ ] Check package.json for issues
- [ ] Try: `expo start -c` to clear cache

### Update Not Appearing
- [ ] Verify update was published: `eas update:list`
- [ ] Check device has internet connection
- [ ] Force quit app completely and reopen
- [ ] Verify branch name matches build profile
- [ ] Wait a few minutes and try again

### Backend Connection Issues
- [ ] Backend server running on AWS
- [ ] Security group allows port 8000
- [ ] API URL correct in app.json
- [ ] CORS configured on backend

### Build Quota Exceeded
- [ ] Upgrade to paid plan ($29/month)
- [ ] Or wait until next month
- [ ] Use `eas build:list` to check usage

## 📊 Success Metrics

Track these to measure deployment success:

- [ ] Time from code change to user seeing update: **< 2 minutes** ✅
- [ ] Team members can test independently: **Yes** ✅
- [ ] PC needs to stay on: **No** ✅
- [ ] Rebuild needed for most changes: **No** ✅
- [ ] Updates work from anywhere: **Yes** ✅

## 🎯 Next Steps After Setup

- [ ] Add more team members to Expo project
- [ ] Set up staged rollouts (gradual updates)
- [ ] Configure push notifications for update alerts
- [ ] Set up error tracking (Sentry)
- [ ] Create production release workflow
- [ ] Submit to Google Play Store (optional)

## 📝 Quick Commands Reference

```powershell
# Building
npm run build:dev          # Development build
npm run build:preview      # Preview build
npm run build:prod         # Production build

# Updating
npm run update:dev         # Update development
npm run update:prod        # Update production

# Checking Status
eas build:list             # List all builds
eas update:list            # List all updates
eas build:view [id]        # View specific build

# Utilities
.\scripts\build-apk.ps1    # Helper script to build
.\scripts\deploy-update.ps1 "message"  # Helper to update
```

## ✅ Final Checklist

Before considering deployment complete:

- [ ] Development APK built and installed
- [ ] Successfully published at least one update
- [ ] Team members have access
- [ ] Backend connection verified
- [ ] GitHub Actions configured (if using)
- [ ] Documentation read and understood
- [ ] Backup plan in place (rollback tested)

---

## 🎉 You're Done!

Once all checkboxes are complete, you have:
- ✅ A fully deployed mobile app
- ✅ Ability to update instantly without rebuilds
- ✅ Team can test from anywhere
- ✅ No need to keep your PC running
- ✅ Professional deployment workflow

**Happy deploying! 🚀**

---

## Support Resources

- 📚 Your guides:
  - [QUICK_DEPLOY_GUIDE.md](QUICK_DEPLOY_GUIDE.md) - Start here
  - [EXPO_AWS_DEPLOYMENT.md](EXPO_AWS_DEPLOYMENT.md) - Detailed guide
  - [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) - Visual overview

- 🌐 External resources:
  - EAS Build: https://docs.expo.dev/build/introduction/
  - EAS Update: https://docs.expo.dev/eas-update/introduction/
  - Expo Discord: https://chat.expo.dev/
