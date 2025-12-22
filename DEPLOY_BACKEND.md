# Backend Deployment Guide

## Quick Deploy (Copy-Paste This)

```bash
# 1. Navigate to backend directory
cd ~/veahome-backend

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies (use legacy peer deps if needed)
npm install --legacy-peer-deps

# 4. Build TypeScript
npm run build

# 5. Restart with PM2
pm2 restart veahome-backend

# 6. Check status
pm2 status
pm2 logs veahome-backend --lines 50
```

## What This Fixes

The backend hub routes are now at:
- ✅ `GET /homes/:homeId/hubs` - List all hubs for a home
- ✅ `POST /homes/:homeId/hubs` - Add new hub
- ✅ `GET /homes/:homeId/hubs/:hubId` - Get hub details
- ✅ `PUT /homes/:homeId/hubs/:hubId` - Update hub
- ✅ `DELETE /homes/:homeId/hubs/:hubId` - Delete hub

This fixes the **404 errors** you're seeing in the app.

## Verify Deployment

```bash
# Test the hub endpoint
curl http://localhost:3000/homes/1/hubs

# Should return: [] or list of hubs
# NOT: 404 error
```

## If Backend Repo Doesn't Exist

```bash
# Clone backend repo
cd ~
git clone https://github.com/ralphestephan/veahome-backend.git
cd veahome-backend

# Install and start
npm install --legacy-peer-deps
npm run build
pm2 start dist/server.js --name veahome-backend
pm2 save
```

## Current Issue Summary

**Problem:** You're in `~/VeaHome` (frontend React Native) instead of `~/veahome-backend`

**Frontend (~/VeaHome):** 
- React Native Expo app
- Has npm dependency conflicts (React 19 vs lucide-react-native)
- Should NOT be on server
- Only needs to be on your local machine

**Backend (~/veahome-backend):**
- Node.js/Express API
- Needs to be deployed on AWS
- This is what fixes the 404 errors

## Fix Frontend npm Error (On Your Local Machine)

If you see the React dependency error locally:

```bash
# Option 1: Use legacy peer deps (recommended)
npm install --legacy-peer-deps

# Option 2: Force install
npm install --force

# Option 3: Downgrade lucide-react-native
npm install lucide-react-native@latest --legacy-peer-deps
```

## Complete Deployment Checklist

- [ ] SSH to AWS: `ssh ubuntu@63.34.243.171`
- [ ] Navigate to backend: `cd ~/veahome-backend`
- [ ] Pull changes: `git pull`
- [ ] Install: `npm install --legacy-peer-deps`
- [ ] Build: `npm run build`
- [ ] Restart: `pm2 restart veahome-backend`
- [ ] Verify: `curl localhost:3000/homes/1/hubs`
- [ ] Check app: 404 errors should be gone

## PM2 Commands Reference

```bash
pm2 list                           # List all processes
pm2 status                         # Status of all processes
pm2 logs veahome-backend           # View logs
pm2 logs veahome-backend --lines 100  # Last 100 lines
pm2 restart veahome-backend        # Restart process
pm2 stop veahome-backend           # Stop process
pm2 delete veahome-backend         # Remove process
pm2 save                           # Save current processes
```
