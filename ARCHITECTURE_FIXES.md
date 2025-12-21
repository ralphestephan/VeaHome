# VeaHome Architecture & Fixes

## System Architecture Clarification

### Hub Level (Brain/Controllers)
**Hubs** are devices with processing power that:
- Connect directly to WiFi/MQTT
- Can control other devices
- Run their own firmware/logic
- Examples:
  - **SmartMonitor (ID: 1)** - ESP32 with DHT22, MQ2, dust sensors → Direct MQTT publishing
  - **VeaHub** - ESP32 Zigbee/RF bridge → Controls Zigbee/RF devices
  - **Tuya Bridge** - Cloud integration → Controls Tuya WiFi devices
  - **eWeLink Bridge** - Cloud integration → Controls eWeLink devices

### Device Level (Controlled Things)
**Devices** are endpoints that:
- Connected through a hub (or standalone if WiFi-capable)
- Don't control other devices
- Examples:
  - Lights, switches controlled by VeaHub
  - Sensors paired to VeaHub
  - Standalone WiFi lights (no hub needed but still "devices")

---

## Current Issues

### 1. ✅ AirGuard Deleted But Still Polling
**Problem**: App continues to call `/public/airguard/1/latest` and `/public/airguard/1/status` even after device deleted.

**Root Cause**: 
- `useHomeData` hook stores devices in React state
- When device is deleted via API, backend removes it
- Frontend cache not invalidated → old device list persists
- `enrichAirguards()` function fetches data for all cached airguards

**Solution**: 
```typescript
// In device deletion handler, invalidate React Query cache:
await mutation.mutateAsync(deviceId);
queryClient.invalidateQueries(['homes', homeId, 'devices']);
queryClient.invalidateQueries(['homes', homeId]);
```

### 2. ❌ 404 Error: `/homes/{homeId}/hubs`
**Problem**: Frontend calls `/homes/{homeId}/hubs` but backend returns 404.

**Status**: 
- Fixed in code (changed route from `/:homeId/hubs` to `/homes/:homeId/hubs`)
- Committed to GitHub
- **NOT YET DEPLOYED TO AWS**

**Action Required**:
```bash
# On AWS EC2:
cd /home/ubuntu/VeaHome
git pull origin main
cd backend
npm run build
pm2 restart veahome-backend
```

### 3. ❌ 403 Error on Home Endpoints
**Problem**: Authorization failing on home-related requests.

**Possible Causes**:
- JWT token expired or invalid
- User trying to access home they're not a member of
- `homeId` mismatch between frontend state and backend

**Debug Steps**:
```bash
# Check backend logs on AWS:
pm2 logs veahome-backend --lines 100

# Look for:
# - "403" errors with context
# - "Unauthorized" or "Forbidden" messages
# - JWT validation failures
```

---

## Database Schema Review

### Hubs Table
```sql
CREATE TABLE hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'veahub', 'airguard', 'tuya_bridge', 'ewelink_bridge'
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'offline',  -- 'online', 'offline'
  last_seen TIMESTAMP,
  metadata JSONB,  -- hub-specific config
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Devices Table
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  hub_id UUID REFERENCES hubs(id) ON DELETE CASCADE,  -- NULL for standalone WiFi devices
  type VARCHAR(50) NOT NULL,  -- 'light', 'sensor', 'thermostat', 'airguard', etc.
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT false,
  signal_mappings JSONB,  -- IR codes, Zigbee endpoints, etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Key Relationship**:
- `airguard` type devices should **also** be in hubs table (they ARE hubs)
- `hub_id` NULL = standalone WiFi device
- `hub_id` set = device controlled by that hub

---

## Immediate Action Plan

### Step 1: Deploy Backend Fixes to AWS
```bash
ssh ubuntu@63.34.243.171
cd /home/ubuntu/VeaHome
git pull origin main
cd backend
npm run build
pm2 restart veahome-backend
pm2 logs veahome-backend --lines 50
```

### Step 2: Update Database Schema
```sql
-- Remove fake sensor defaults from existing rows
ALTER TABLE rooms 
  ALTER COLUMN temperature DROP DEFAULT,
  ALTER COLUMN humidity DROP DEFAULT;

UPDATE rooms 
SET temperature = NULL, humidity = NULL 
WHERE temperature = 22.0 AND humidity = 50.0;
```

### Step 3: Fix Frontend Cache Invalidation
Add to device deletion handlers:
```typescript
// After successful device deletion:
queryClient.invalidateQueries(['homes', homeId]);
queryClient.invalidateQueries(['homes', homeId, 'devices']);
queryClient.invalidateQueries(['homes', homeId, 'rooms']);
```

### Step 4: Verify Hub/Device Separation
Check if SmartMonitor (Device ID 1) should be:
- [ ] In `hubs` table as type `'airguard'`
- [ ] In `devices` table as type `'airguard'` with `hub_id = NULL`
- [ ] Both (hub entry + device entry for UI display)

---

## API Endpoint Structure (Current)

### Hub Endpoints
```
GET    /hubs/homes/:homeId/hubs          # List hubs for home
POST   /hubs/homes/:homeId/hubs          # Add hub
GET    /hubs/:hubId                      # Get hub details
DELETE /hubs/:hubId                      # Remove hub
```

### Device Endpoints
```
GET    /homes/:homeId/devices            # List all devices
POST   /homes/:homeId/devices            # Add device
GET    /devices/:deviceId                # Get device
PUT    /devices/:deviceId                # Update device
DELETE /devices/:deviceId                # Remove device
POST   /devices/:deviceId/control        # Control device
```

### AirGuard/SmartMonitor Public Endpoints
```
GET    /public/airguard/:id/latest       # Latest sensor readings (from InfluxDB)
GET    /public/airguard/:id/status       # Online/offline status
POST   /public/airguard/:id/buzzer       # Control buzzer
GET    /public/airguard/:id/thresholds   # Get alert thresholds
POST   /public/airguard/:id/thresholds   # Set alert thresholds
```

**Note**: `/public/airguard` endpoints don't require auth - designed for device-to-device communication.

---

## Testing Checklist

After deploying fixes:

- [ ] Device deletion removes from UI immediately
- [ ] No polling for deleted airguards
- [ ] Hubs list endpoint returns 200 (not 404)
- [ ] Can view home details without 403 error
- [ ] Rooms show NULL temp/humidity when no sensors
- [ ] Can add new device via provisioning wizard
- [ ] SmartMonitor status updates in real-time

---

## Future Architectural Improvements

1. **Unified Hub Interface**:
   - Create `IHub` interface for all hub types
   - Standardize hub-device communication protocol
   - Hub discovery/pairing flow

2. **Device Registry**:
   - Central registry of device types and capabilities
   - Dynamic UI generation based on device schema
   - Plugin system for new device types

3. **Real-time State Sync**:
   - WebSocket connection per home
   - Push updates for device state changes
   - Eliminate polling entirely

4. **Offline Mode**:
   - Cache device state locally
   - Queue commands when offline
   - Sync on reconnection
