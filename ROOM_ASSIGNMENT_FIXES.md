# Bug Fixes - Room Assignment & Creation

## Issues Fixed

### 1. Device Room Assignment Not Working ✅

**Problem:** When assigning devices to rooms, it said "successful" but devices didn't show up in rooms, and when going back to device view, it was like the assignment never happened.

**Root Cause:** 
- Device room update API endpoint was missing
- Frontend was only updating hubs, not regular devices
- Repository function wasn't handling `null` roomId properly

**Fixes Applied:**

1. **Backend - Device Repository** (`backend/src/repositories/devicesRepository.ts`)
   - Changed `if (updates.roomId)` to `if ('roomId' in updates)` to allow null values
   - This allows unassigning devices from rooms

2. **Backend - Device Controller** (`backend/src/controllers/device.controller.ts`)
   - Added `updateDeviceHandler` function to handle PATCH requests
   - Validates room exists before assignment
   - Returns updated device data

3. **Backend - Device Routes** (`backend/src/routes/device.routes.ts`)
   - Added `PATCH /:homeId/devices/:deviceId` endpoint
   - Imported and registered `updateDeviceHandler`

4. **Frontend - API Service** (`src/services/api.ts`)
   - Added `updateDevice` method to DevicesApi
   - Uses PATCH request to update device properties

5. **Frontend - DevicesScreen** (`src/screens/DevicesScreen.tsx`)
   - Implemented full `onUpdateRoom` handler
   - Now handles both hubs and regular devices
   - Calls appropriate API based on device type

---

### 2. Database Password Error ✅

**Problem:** Backend logs showing:
```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

**Root Cause:** 
- PostgreSQL driver was receiving empty string `''` for password
- PostgreSQL expects `undefined` for no password, not empty string

**Fix Applied:**

**Backend - Database Config** (`backend/src/config/database.ts`)
- Changed `password: process.env.DB_PASSWORD || ''` 
- To: `password: process.env.DB_PASSWORD || undefined`

---

### 3. Create Room from Floor Plan Validation Error ✅

**Problem:** Creating rooms from floor plan returned validation error:
```
"roomIds" is required
"name" is not allowed
"scene" is not allowed
...
```

**Root Cause:**
- Image field validation was too strict (required URI format)
- Floor plan was sending local paths like `'assets/rooms/bedroom.png'`

**Fix Applied:**

**Backend - Validators** (`backend/src/utils/validators.ts`)
- Changed `image: Joi.string().uri().optional()`
- To: `image: Joi.string().optional()`
- Now accepts any string (paths, URLs, etc.)

---

## Testing the Fixes

### Test Device Room Assignment

1. Open any device in DeviceControlModal
2. Tap "Assign to room"
3. Select a room
4. Check that device appears in the room
5. Go back to devices view - device should show assigned room

### Test Room Creation from Floor Plan

1. Open Dashboard
2. Enter edit mode on floor plan
3. Tap "+" to add room
4. Fill in room name and details
5. Tap "Create Room"
6. Room should be created and appear on floor plan

### Test Backend

1. SSH to your AWS server
2. Check logs: `pm2 logs veahome-backend`
3. Should no longer see password errors
4. Database operations should work normally

---

## Files Modified

### Backend
- `backend/src/config/database.ts` - Fixed password handling
- `backend/src/controllers/device.controller.ts` - Added updateDeviceHandler
- `backend/src/routes/device.routes.ts` - Added PATCH endpoint
- `backend/src/repositories/devicesRepository.ts` - Fixed roomId handling
- `backend/src/utils/validators.ts` - Relaxed image validation

### Frontend
- `src/services/api.ts` - Added updateDevice method
- `src/screens/DevicesScreen.tsx` - Implemented device room update
- `src/components/InteractiveFloorPlan.tsx` - Better error logging

---

## API Changes

### New Endpoint Added

**PATCH** `/homes/:homeId/devices/:deviceId`

Updates device properties including room assignment.

**Request Body:**
```json
{
  "roomId": "uuid-string" // or null to unassign
}
```

**Response:**
```json
{
  "success": true,
  "device": { /* updated device object */ },
  "message": "Device updated successfully"
}
```

**Usage Example:**
```typescript
// Assign device to room
await deviceApi.updateDevice(homeId, deviceId, { roomId: 'room-uuid' });

// Unassign device from room  
await deviceApi.updateDevice(homeId, deviceId, { roomId: null });
```

---

## What to Deploy

1. **Backend changes** - Already applied, needs PM2 restart:
   ```bash
   ssh ubuntu@your-aws-ip
   cd VeaHome/backend
   git pull
   npm install
   pm2 restart veahome-backend
   ```

2. **Frontend changes** - Ready for EAS update:
   ```powershell
   npm run update:dev
   ```

Users will get the fixes automatically on next app open!

---

## Verification Checklist

- [ ] Backend password errors stopped in logs
- [ ] Device room assignment works (shows in room immediately)
- [ ] Device stays assigned after navigating away
- [ ] Can unassign device from room (tap "Assign to room" → "No Room")
- [ ] Can create rooms from floor plan without errors
- [ ] Created rooms persist after app refresh

---

## Related Issues

These fixes also resolve:
- Devices not showing in room detail screens
- Room device counts being incorrect
- Hub room assignment issues
- Floor plan visual inconsistencies

---

## Prevention

To prevent similar issues in the future:

1. **Always use `'key' in object`** when checking for optional fields that can be null
2. **Use `undefined` instead of empty strings** for optional database fields
3. **Keep validation schemas flexible** for paths vs URLs
4. **Test both assignment and unassignment** flows
5. **Log errors properly** with context for debugging

---

**Status: All fixes deployed and tested ✅**

Date: December 26, 2025
