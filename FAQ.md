# Frequently Asked Questions (FAQ)

## General Questions

### Q: Do I really not need to keep my PC running?
**A:** Correct! After you publish an update with `npm run update:dev`, EAS hosts it on their servers. Your PC can be turned off, asleep, or even broken - the updates will still reach users.

### Q: How long does the first build take?
**A:** About 15-20 minutes. EAS builds your APK on their cloud servers. You only do this once (or when you change native code/dependencies).

### Q: How long do updates take?
**A:** About 30 seconds to publish. Users download the update in 5-10 seconds when they open the app (update size is typically 2-5 MB).

### Q: Is this free?
**A:** Yes! The free tier includes:
- 10 builds per month (you'll use ~1-2)
- Unlimited updates
- 5 team members
This is perfect for your needs!

### Q: What if I need more than 10 builds per month?
**A:** You probably won't! 95% of changes only need updates, not rebuilds. But if needed, the paid plan is $29/month for unlimited builds.

## Technical Questions

### Q: Can users update the app without reinstalling?
**A:** Yes! That's the magic of EAS Update. Users just open the app and it automatically downloads the latest version.

### Q: What types of changes require a rebuild?
**A:** Only:
- Adding/removing npm packages
- Changing Android/iOS permissions
- Modifying native code
- Updating Expo SDK

Everything else (99% of changes) just needs `npm run update:dev`!

### Q: What types of changes can be updated instantly?
**A:** Almost everything:
- UI changes (layouts, styles, colors)
- Business logic
- API endpoints
- Bug fixes
- New screens/features (JavaScript only)
- Text changes

### Q: How do users know there's an update?
**A:** It's automatic! When they open the app:
1. App checks for updates
2. Downloads if available (2-5 MB)
3. Applies on next app restart
4. User sees changes immediately

You can also add a notification: "Update available - restart app to apply"

### Q: Can I rollback a bad update?
**A:** Yes! Very easily:
```powershell
# See update history
eas update:list

# Rollback to previous version
eas update:republish [previous-update-id]
```

### Q: Do all users get updates at the same time?
**A:** Almost! When they next open the app. You can also implement:
- Staged rollouts (10% → 50% → 100%)
- Force immediate updates
- Optional updates

## Setup Questions

### Q: I don't have an Expo account. How do I create one?
**A:** 
1. Go to https://expo.dev
2. Click "Sign Up"
3. Use GitHub, Google, or email
4. Confirm your email
5. Run `eas login` in terminal

Free and takes 2 minutes!

### Q: Do I need to change my backend code?
**A:** No! Your backend stays exactly as is on AWS. EAS only handles:
- Building the mobile app
- Distributing updates
Your backend at `http://63.34.243.171:8000` continues working unchanged.

### Q: Can I still use `expo start` for local development?
**A:** Absolutely! Use `expo start` or `npm start` for local development as usual. Use EAS only for:
- Building APKs for distribution
- Publishing updates to distributed APKs

### Q: What's the difference between `expo start` and `eas build`?
**A:**
- `expo start` = Local development server (for you)
- `eas build` = Cloud build service (creates installable APK)
- `eas update` = Publish changes to existing APKs

## Distribution Questions

### Q: How do I share the APK with my team?
**A:** After running `npm run build:dev`, you get a link like:
```
https://expo.dev/accounts/[account]/projects/veahome/builds/[id]
```
Share this link! Team members can open it on their phones and download the APK directly.

### Q: Do I need Google Play Store?
**A:** No! You can distribute directly via the download link. Perfect for:
- Internal testing
- Beta testers
- Team members

Upload to Play Store only when you want public distribution.

### Q: Can iOS users test too?
**A:** Yes, but iOS requires:
- Apple Developer account ($99/year)
- TestFlight for distribution
- Different build command: `eas build --platform ios`

Android is easier for testing (no fees, direct APK distribution).

### Q: How many devices can install the APK?
**A:** Unlimited! The APK download link works for anyone you share it with.

## Workflow Questions

### Q: What's a typical daily workflow?
**A:**
```
Morning:
  1. git pull (get latest team changes)
  2. npm start (test locally)
  3. Make your changes
  4. Test locally
  5. npm run update:dev
  6. Done! (2 minutes)

Throughout day:
  - Repeat steps 3-5 as needed
  - Each update takes ~30 seconds

End of day:
  - git commit & push
  - Team gets updates automatically
```

### Q: Can multiple developers work on the same project?
**A:** Yes! Add them to your Expo project:
1. Go to https://expo.dev/accounts/[account]/projects/veahome/collaborators
2. Add their email/username
3. They can now publish updates

### Q: How do I handle multiple versions (dev, staging, production)?
**A:** Use branches!
```powershell
# Development updates
npm run update:dev

# Production updates
npm run update:prod
```

Users install APKs built for specific branches and only get updates for that branch.

## Troubleshooting Questions

### Q: Build failed - what do I do?
**A:**
1. Check logs: `eas build:list` then click the build
2. Common fixes:
   - Clear cache: `expo start -c`
   - Update dependencies: `npm install`
   - Check app.json for errors
3. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Q: Update not showing on device - why?
**A:**
1. Force close the app completely
2. Reopen it
3. Wait 10 seconds on splash screen
4. Still not working? Check:
   - Device has internet
   - Update was published: `eas update:list`
   - Branch name matches

### Q: Users report different versions - help!
**A:** This happens when:
- Some haven't opened app since update
- Some have auto-update disabled
- Different users on different branches

Solution: Add version display in your app's settings screen.

## Security Questions

### Q: Is it safe to use EAS?
**A:** Yes! Expo is used by thousands of companies including:
- Major startups
- Fortune 500 companies  
- Healthcare apps (HIPAA compliant possible)

Your backend and data stay on your AWS servers. EAS only hosts the app code.

### Q: Can I use this for production apps?
**A:** Absolutely! Many production apps use EAS:
- Apps in App Store / Play Store
- Enterprise apps
- Consumer apps with millions of users

### Q: What about API keys and secrets?
**A:** Store them properly:
- Use `expo-constants` with `.env` files
- Never commit secrets to git
- Use AWS Secrets Manager for backend
- EAS has secure environment variables for build-time secrets

### Q: Can someone steal my app code?
**A:** Your code is as secure as any mobile app:
- JavaScript is bundled and minified
- Use code obfuscation if needed
- Critical logic stays on your AWS backend
- Standard mobile app security applies

## Cost Questions

### Q: What's the total monthly cost?
**A:**
```
EAS Free Tier:    $0
AWS Backend:      ~$30 (your existing costs)
Total:            ~$30/month
```

You're not adding any new costs - just using a free service for app distribution!

### Q: When would I need to pay?
**A:** Only if you:
- Need >10 builds per month (unlikely - most changes are updates)
- Want >5 team members
- Need priority build queue
- Want advanced features (staged rollouts, etc.)

Even then, it's only $29/month!

### Q: Is there a cheaper alternative?
**A:** You could self-host everything on AWS, but:
- Higher AWS costs (~$80/month for bigger instance)
- More maintenance work
- Slower build times
- No built-in update system
- More complexity

EAS is actually the cost-effective choice!

## Comparison Questions

### Q: EAS vs. Self-hosting on AWS?
**A:**
| Factor | EAS | Self-Host |
|--------|-----|-----------|
| Cost | $0-29/mo | ~$80+/mo |
| Setup | 30 min | 4-6 hours |
| Maintenance | None | Weekly |
| Updates | Built-in | Build yourself |
| Speed | Fast CDN | Depends |
| Reliability | 99.9% | Your responsibility |

**Verdict:** EAS is better for 95% of cases!

### Q: EAS vs. Code Push (Microsoft)?
**A:**
| Factor | EAS | Code Push |
|--------|-----|-----------|
| Maintenance | Active | Deprecated |
| Modern | Yes | Outdated |
| Expo Support | Native | Workarounds |
| Documentation | Excellent | Minimal |

**Verdict:** Code Push is deprecated, use EAS!

### Q: EAS vs. Google Play Store instant updates?
**A:** Different purposes:
- **Play Store:** Public distribution, takes days for review
- **EAS Update:** Instant updates for existing installs
- **Best approach:** Use both! Play Store for new users, EAS for instant updates to existing users

## Future Questions

### Q: Can I switch to Play Store later?
**A:** Yes! Easy:
1. Run `npm run build:prod`
2. Download the `.aab` file (not `.apk`)
3. Upload to Play Store
4. Continue using EAS Update for instant updates

Your Play Store app will still receive OTA updates via EAS!

### Q: Can I migrate from EAS if needed?
**A:** Yes, but you probably won't want to! If needed:
1. Your code is yours (not locked in)
2. Build APKs locally with `eas build --local`
3. Use any other update service
4. Self-host if desired

But EAS is so convenient, most people never leave!

### Q: What if Expo shuts down?
**A:** Very unlikely (backed by major investors), but:
- Your code is yours
- You can build locally
- Backend is on your AWS
- You're not locked in
- Plenty of alternatives exist

## Still Have Questions?

### 📚 Check the guides:
- [START_HERE.md](START_HERE.md) - Quick start
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- [EXPO_AWS_DEPLOYMENT.md](EXPO_AWS_DEPLOYMENT.md) - Complete guide

### 🌐 External resources:
- EAS Docs: https://docs.expo.dev/eas/
- Expo Forums: https://forums.expo.dev/
- Expo Discord: https://chat.expo.dev/

### 💬 Get help:
- Ask in Expo Discord (very active!)
- Post on Stack Overflow with tag `expo`
- Check Expo documentation

**Most common questions are answered in the guides - start with START_HERE.md! 🚀**
