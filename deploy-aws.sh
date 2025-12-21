#!/bin/bash
# VeaHome AWS Deployment Script
# Run this on your AWS EC2 instance after pushing changes to GitHub

echo "=== VeaHome Backend Deployment ==="
echo ""

# Navigate to project directory
cd /home/ubuntu/VeaHome || { echo "Error: Project directory not found"; exit 1; }

# Pull latest changes from GitHub
echo "[1/4] Pulling latest changes from GitHub..."
git pull origin main || { echo "Error: Git pull failed"; exit 1; }

# Install/update dependencies
echo ""
echo "[2/4] Installing dependencies..."
cd backend
npm install || { echo "Error: npm install failed"; exit 1; }

# Build TypeScript
echo ""
echo "[3/4] Building TypeScript..."
npm run build || { echo "Error: Build failed"; exit 1; }

# Restart PM2 process
echo ""
echo "[4/4] Restarting backend service..."
pm2 restart veahome-backend || pm2 start dist/server.js --name veahome-backend

# Show logs
echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Showing recent logs (Ctrl+C to exit):"
pm2 logs veahome-backend --lines 30
