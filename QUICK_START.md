# VeaHome Quick Start Guide

This guide will help you set up and run the VeaHome smart home application locally.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ installed
- Yarn or npm package manager
- (Optional) Docker for containerized PostgreSQL

---

## Step 1: Database Setup

### Option A: Local PostgreSQL

1. **Install PostgreSQL** (if not already installed):
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

2. **Create database**:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE veahome;

# Exit psql
\q
```

### Option B: Docker PostgreSQL (Recommended for Development)

```bash
docker run --name veahome-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=veahome \
  -p 5432:5432 \
  -d postgres:15
```

---

## Step 2: Backend Setup

1. **Navigate to backend directory**:
```bash
cd /app/backend
```

2. **Install dependencies** (already done, but run if needed):
```bash
yarn install
```

3. **Configure environment variables**:
The `.env` file is already created. Update if needed:
```bash
# Edit .env file
nano .env

# Update these values:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=veahome
DB_USER=postgres
DB_PASSWORD=password  # Change this!
```

4. **Run database migrations**:
```bash
# Build TypeScript first
yarn build

# Run migrations
node dist/database/migrate.js
```

5. **Start backend server**:
```bash
# Development mode (with hot reload)
yarn dev

# Or production mode
yarn start
```

The backend server will start on **http://localhost:8000**

---

## Step 3: Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd /app/frontend
```

2. **Update API base URL in app.json**:
```bash
nano app.json
```

Update the `apiBaseUrl`:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "http://localhost:8000"
    }
  }
}
```

3. **Install dependencies** (if needed):
```bash
yarn install
```

4. **Start Expo development server**:
```bash
yarn start
```

5. **Run on device/simulator**:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

---

## Step 4: Test the Application

### Test Backend API

1. **Health check**:
```bash
curl http://localhost:8000/health
```

2. **Register a user**:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@veahome.com",
    "password": "password123"
  }'
```

3. **Login**:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@veahome.com",
    "password": "password123"
  }'
```

Save the `token` from the response.

4. **Get user info**:
```bash
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Frontend

1. Open the app on your device/simulator
2. You should see the login screen
3. Register or login with the credentials you created
4. Explore the dashboard, devices, energy, scenes, and settings screens

---

## Common Issues & Solutions

### Issue: Database connection failed

**Solution:**
- Check if PostgreSQL is running: `pg_isready`
- Verify credentials in `.env` file
- Check if database exists: `psql -U postgres -l`

### Issue: Port 8000 already in use

**Solution:**
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=8001
```

### Issue: Frontend can't connect to backend

**Solution:**
- Ensure backend is running: `curl http://localhost:8000/health`
- Check `apiBaseUrl` in frontend/app.json
- For physical device, use your computer's IP instead of localhost:
  ```json
  "apiBaseUrl": "http://192.168.1.X:8000"
  ```

### Issue: TypeScript build errors

**Solution:**
```bash
cd /app/backend
rm -rf node_modules dist
yarn install
yarn build
```

---

## Development Workflow

### Backend Development

1. Make changes to TypeScript files in `/app/backend/src/`
2. Server auto-reloads with `yarn dev`
3. Test endpoints with curl or Postman
4. Check logs in terminal

### Frontend Development

1. Make changes to React Native files in `/app/frontend/src/`
2. Save files to trigger hot reload
3. Shake device and select "Reload" if needed
4. Check logs in Expo DevTools

---

## Directory Structure

```
/app/
├── backend/                    # Express.js backend
│   ├── src/                   # TypeScript source code
│   ├── dist/                  # Compiled JavaScript (after build)
│   ├── database/              # Migrations and seeds
│   ├── .env                   # Environment variables
│   └── package.json
│
├── frontend/                  # React Native frontend
│   ├── src/                   # React components and screens
│   ├── app.json               # Expo configuration
│   └── package.json
│
└── QUICK_START.md            # This file
```

---

## Useful Commands

### Backend
```bash
cd /app/backend

# Development
yarn dev               # Start with hot reload
yarn build             # Build TypeScript
yarn start             # Start production server

# Database
yarn migrate           # Run migrations
psql -U postgres -d veahome  # Connect to database
```

### Frontend
```bash
cd /app/frontend

# Development
yarn start             # Start Expo
yarn android           # Run on Android
yarn ios               # Run on iOS

# Debugging
yarn start --clear     # Clear cache and start
```

---

## Next Steps

✅ Phase 1 Complete: Backend core is running!

**Next phases:**
1. Configure AWS IoT Core for ESP32 hub integration
2. Enhance WebSocket real-time features
3. Implement scheduler and automation engine
4. Refine frontend UI/UX
5. Complete testing and deployment

---

## Support

For issues or questions:
1. Check the logs in terminal
2. Review error messages
3. Consult the README files in backend/ and frontend/
4. Check IMPLEMENTATION_STATUS.md for current progress

---

**Happy Coding! 🚀**
