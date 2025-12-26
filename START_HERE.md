# 🎯 Start Here: Deploy VeaHome in 3 Steps

## What You Want

✅ Run your Expo app from AWS  
✅ Test on Android devices anywhere  
✅ Update the app instantly without rebuilding  
✅ No need to keep your PC running  

## What We're Using

**EAS (Expo Application Services)** - The professional way to deploy Expo apps!

- Handles building your APK in the cloud
- Provides instant over-the-air (OTA) updates
- No server maintenance needed
- Free tier perfect for your needs

## 🚀 3-Step Quick Start

### Step 1: Build Your APK (One-Time, ~20 min)

```powershell
# Make sure you're logged in
eas login

# Build the APK (EAS does this in the cloud)
npm run build:dev
```

Wait for the build to complete. You'll get a download link.

### Step 2: Install on Devices

1. Open the download link on your Android phone
2. Download and install the APK
3. Share the same link with your team

**Everyone installs the same APK once!**

### Step 3: Update Anytime (Instant, ~30 sec)

```powershell
# Make your code changes...

# Then publish an update
npm run update:dev
```

**Users automatically get the update next time they open the app!**

---

## 🎓 Learn More

- **New to this?** → Read [QUICK_DEPLOY_GUIDE.md](QUICK_DEPLOY_GUIDE.md)
- **Want details?** → Read [EXPO_AWS_DEPLOYMENT.md](EXPO_AWS_DEPLOYMENT.md)
- **Visual learner?** → Read [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)
- **Step-by-step?** → Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 📱 Daily Workflow

```powershell
# 1. Write code
code src/screens/DashboardScreen.tsx

# 2. Update app
npm run update:dev

# 3. Done! ✨ (takes 30 seconds)
```

Your team sees changes instantly. No rebuild. No restart. No keeping PC on.

---

## 💡 Key Benefits

| Old Way | New Way (EAS) |
|---------|---------------|
| Keep PC running 24/7 | PC can be off |
| Restart server for changes | Updates in 30 seconds |
| Users need your network | Works from anywhere |
| Manual distribution | One download link |
| 20 min rebuild per change | Instant JS updates |

---

## 🆘 Need Help?

1. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for troubleshooting
2. Read [EXPO_AWS_DEPLOYMENT.md](EXPO_AWS_DEPLOYMENT.md) for detailed info
3. Ask on Expo Discord: https://chat.expo.dev/

---

## ✅ What's Already Done

Your project is already configured with:
- ✅ EAS configuration in `eas.json`
- ✅ Update settings in `app.json`
- ✅ Helpful npm scripts in `package.json`
- ✅ GitHub Actions for auto-deploy
- ✅ PowerShell helper scripts

**You're ready to go! Just run the 3 steps above. 🚀**

---

## 🎯 Quick Commands

```powershell
# Build APK (do once)
npm run build:dev

# Publish updates (do often)
npm run update:dev

# Check status
eas build:list      # See all builds
eas update:list     # See all updates
```

---

**Ready? Start with Step 1 above! 🎉**
