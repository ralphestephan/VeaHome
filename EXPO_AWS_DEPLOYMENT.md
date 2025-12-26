# Expo AWS Deployment with Live Updates

This guide will help you deploy your Expo app to AWS with continuous live updates, without needing to keep your PC running.

## Overview

We'll use two approaches:
1. **EAS Update** - For instant OTA updates without rebuilding (recommended)
2. **Self-hosted Update Server on AWS** - Alternative for full control

## Option 1: EAS Update (Recommended - Easiest)

### Step 1: Install EAS CLI

```powershell
npm install -g eas-cli
```

### Step 2: Login to Expo

```powershell
eas login
```

### Step 3: Configure Your Project

Already done! Your `eas.json` is configured.

### Step 4: Build Development APK

Build a development client that can receive OTA updates:

```powershell
eas build --platform android --profile development
```

This creates an APK that team members can download and install once.

### Step 5: Update Your App Config

Add the updates configuration to `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[your-project-id]"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### Step 6: Publish Updates

Whenever you make changes, publish an update:

```powershell
eas update --branch development --message "Your update message"
```

Users will receive the update automatically when they open the app!

### Step 7: Automate with GitHub Actions (Optional)

Create `.github/workflows/eas-update.yml` to auto-publish on push.

---

## Option 2: Self-Hosted Update Server on AWS

If you want full control and host everything yourself:

### Architecture

```
AWS EC2 Instance
├── Expo CLI Development Server
├── nginx (reverse proxy)
└── PM2 (process manager)
```

### Step 1: Launch EC2 Instance

- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t3.medium (minimum)
- Security Group: Allow ports 22, 80, 443, 8081, 19000-19001

### Step 2: Connect and Setup

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Expo CLI
sudo npm install -g expo-cli eas-cli
```

### Step 3: Deploy Your Code

```bash
# Clone your repository
git clone https://github.com/your-repo/VeaHome.git
cd VeaHome

# Install dependencies
npm install

# Setup environment
cp CREDENTIALS.env .env
```

### Step 4: Configure PM2

Create `ecosystem.config.js` in your project root (see the file created below).

### Step 5: Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Configure nginx (Optional)

```bash
sudo apt install -y nginx

# Configure reverse proxy for Expo
sudo nano /etc/nginx/sites-available/expo
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/expo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Update App Configuration

Update your `app.json` to point to your AWS server:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://your-ec2-ip:8081"
    }
  }
}
```

---

## Building and Distributing APK

### For Internal Testing (Development Build)

```powershell
# Build development APK
eas build --platform android --profile development

# Download the APK from EAS dashboard
# Share the link with your team
```

### For Preview/Testing (Standalone Build)

```powershell
# Build preview APK
eas build --platform android --profile preview
```

### Distributing to Team

1. **EAS Dashboard**: After build completes, get the download link from https://expo.dev
2. **Share Link**: Team members can download APK directly to Android devices
3. **Install**: Enable "Install from Unknown Sources" on Android and install

---

## Continuous Deployment Workflow

### Option A: Using EAS Update (Recommended)

```powershell
# Make your changes
# Commit to git
git add .
git commit -m "Your changes"
git push

# Publish update (no rebuild needed!)
eas update --branch development --message "Updated feature X"
```

Users get the update next time they open the app (or immediately if app is open).

### Option B: Using AWS Server

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Pull latest changes
cd VeaHome
git pull origin main

# Install new dependencies if any
npm install

# Restart the server
pm2 restart expo-dev
```

---

## GitHub Actions Automation

Create `.github/workflows/deploy.yml` (see file below) to automatically publish updates on every push to main.

---

## Comparison

| Feature | EAS Update | Self-Hosted |
|---------|-----------|-------------|
| Setup Complexity | Easy | Moderate |
| Cost | Free tier available | EC2 costs |
| OTA Updates | ✅ Built-in | ⚠️ Manual setup |
| Control | Limited | Full |
| Maintenance | None | Server maintenance |
| Speed | Fast CDN | Depends on EC2 |

---

## Recommended Approach

**Use EAS Update** (Option 1) because:
- ✅ No server maintenance
- ✅ Instant OTA updates
- ✅ Free for small teams
- ✅ Works from anywhere
- ✅ Built-in versioning and rollback
- ✅ No need to keep PC running

Your backend can still run on AWS while Expo handles the app distribution and updates!

---

## Next Steps

1. Run `eas build --platform android --profile development`
2. Wait for build to complete (~20 minutes)
3. Download and install APK on test devices
4. Make changes to your code
5. Run `eas update --branch development`
6. Open app on device - see changes instantly!

---

## Troubleshooting

### Build Fails
- Check `eas build:list` for error logs
- Ensure all dependencies are compatible
- Verify Android package name in app.json

### Updates Not Appearing
- Check app is connected to internet
- Verify branch name matches
- Force close and reopen app
- Check `eas update:list` for published updates

### Can't Connect to Backend
- Update API URLs in your app configuration
- Ensure AWS backend security groups allow traffic
- Check CORS settings on backend

---

## Cost Estimate

### EAS (Recommended)
- **Free Plan**: 10 builds/month, unlimited updates
- **Production Plan**: $29/month - unlimited builds

### AWS Self-Hosted
- **t3.medium**: ~$30/month
- **Data transfer**: ~$9/GB
- **Total**: ~$40-60/month

**Recommendation**: Use EAS for app distribution + AWS for backend = Best of both worlds!
