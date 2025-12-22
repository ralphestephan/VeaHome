# QUICK FIX GUIDE - Current Issues

## Issue 1: Hub 404 Errors ❌ CRITICAL
**Problem:** App shows "404 Not Found" when accessing `/homes/{homeId}/hubs`
**Cause:** Backend code is fixed but NOT deployed to AWS
**Solution:** Deploy backend immediately

### Deploy Backend:
```powershell
# Option 1: SSH and deploy
ssh ubuntu@63.34.243.171
cd veahome-backend
git pull
npm install
npm run build
pm2 restart veahome-backend

# Option 2: From your machine
ssh ubuntu@63.34.243.171 "cd veahome-backend && git pull && npm install && npm run build && pm2 restart veahome-backend"
```

**Files Changed:**
- backend/src/server.ts (Line 51): Added `/homes` prefix to hub routes
- backend/src/routes/hub.routes.ts (Line 16): Route now `/homes/:homeId/hubs`

**Commit:** f3e848c (NOT DEPLOYED YET)

---

## Issue 2: Device Onboarding "Failed" ✅ FIXED
**Problem:** Device provisioning shows "Configuration Failed"
**Cause:** Automatic WiFi library doesn't work in Expo Go
**Solution:** Switched to manual WiFi connection (industry standard)

### New Flow (Like Tuya/SmartLife):
1. **Intro Screen** - Explains process
2. **Connect Screen** - Opens WiFi settings, user connects to "SmartMonitor_Setup"
3. **Credentials Screen** - User enters home WiFi password
4. **Provisioning Screen** - HTTP POST sends credentials to device
5. **Success Screen** - Device reboots and connects

**Fixed in commit:** 0dc1084 ✅

---

## Testing Device Provisioning

### Requirements:
1. **ESP32 with firmware** - firmware_v4_ap_mode.cpp uploaded
2. **Device in Setup Mode** - Shows "SETUP MODE" on screen
3. **Phone with app** - Expo Go or production build

### Test Steps:
```
1. Flash firmware to ESP32
2. Power on device → Shows "SETUP MODE"
3. Open app → Devices → Add Device → AirGuard
4. Follow on-screen instructions:
   - Tap "Open WiFi Settings"
   - Connect to "SmartMonitor_Setup"
   - Return to app
   - Tap "I'm Connected"
   - Enter home WiFi password
   - Tap "Configure Device"
5. Wait 10-30 seconds
6. Device restarts and connects to home WiFi
7. Device appears in Devices list within 1-2 minutes
```

### Troubleshooting:

**"SmartMonitor_Setup" not visible:**
- ESP32 not powered
- Firmware not uploaded
- Hold RESET button 3 seconds to restart AP mode

**"Configuration Failed":**
- Not connected to device WiFi
- Check phone is on "SmartMonitor_Setup" network
- Try opening browser → http://192.168.4.1 (should see web form)

**Device won't connect to home WiFi:**
- Wrong password entered
- Network out of range
- 5GHz network (ESP32 only supports 2.4GHz)

**Device not appearing in app:**
- MQTT broker down
- Check: `nc -zv 63.34.243.171 1883`
- Backend not deployed (404 errors prevent device registration)

---

## Priority Actions

### 1. Deploy Backend (URGENT)
```powershell
ssh ubuntu@63.34.243.171 "cd veahome-backend && git pull && npm install && npm run build && pm2 restart veahome-backend"
```
**Fixes:** Hub 404 errors in app

### 2. Test Device Provisioning
- Flash firmware_v4_ap_mode.cpp to ESP32
- Run through provisioning flow in app
- Verify device appears in Devices list

### 3. Fix TypeScript Errors (Optional)
Minor type issues in:
- DashboardScreen.tsx (homeId undefined check)
- HomeSelectorScreen.tsx (theme constants)
- RoomDetailScreen.tsx (style name typo)

---

## Current State

✅ **Working:**
- Device provisioning UI (manual WiFi connection)
- Firmware with AP mode + HTTP provisioning
- Backend code fixed (hub routes corrected)

❌ **Not Working:**
- Hub 404 errors (backend not deployed)
- Device registration (blocked by 404 errors)

⏳ **Needs Testing:**
- End-to-end provisioning flow with real ESP32
- MQTT telemetry after provisioning

---

## Next Steps

1. **DEPLOY BACKEND** ← Do this first!
2. Flash firmware to ESP32
3. Test complete provisioning flow
4. Verify device telemetry in app
5. Fix remaining TypeScript errors

---

## Files Changed (Last 3 Commits)

**Commit 0dc1084** (Latest):
- src/screens/DeviceProvisioningESPTouch.tsx
- Simplified to manual WiFi switching
- Added clear step-by-step instructions
- Better error handling

**Commit 384d590**:
- Added react-native-wifi-reborn package
- Automatic WiFi switching (didn't work in Expo Go)

**Commit 585f10e**:
- firmware/firmware_v4_ap_mode.cpp (new)
- Complete ESP32 firmware with AP mode
- HTTP provisioning endpoint
- Captive portal support

---

## Manual Testing Checklist

Device Provisioning:
- [ ] ESP32 powers on and shows "SETUP MODE"
- [ ] "SmartMonitor_Setup" WiFi visible in phone settings
- [ ] Can connect to device WiFi
- [ ] App shows "Connect to Device" screen
- [ ] Opens WiFi settings when tapped
- [ ] Can proceed after connecting
- [ ] Credentials screen shows
- [ ] Can enter WiFi password
- [ ] HTTP POST succeeds
- [ ] Device shows "SUCCESS!" and restarts
- [ ] Device connects to home WiFi
- [ ] Device shows sensor data on screen
- [ ] Device appears in app Devices list

Backend:
- [ ] No 404 errors on /homes/:homeId/hubs
- [ ] Devices list loads
- [ ] Hub status endpoint works
- [ ] MQTT telemetry received

---

## Quick Commands

**Check MQTT Broker:**
```powershell
nc -zv 63.34.243.171 1883
```

**Check Backend:**
```powershell
curl http://63.34.243.171:3000/health
```

**SSH to Server:**
```powershell
ssh ubuntu@63.34.243.171
```

**View Backend Logs:**
```bash
pm2 logs veahome-backend
```

**Restart Backend:**
```bash
pm2 restart veahome-backend
```

**Reset ESP32 WiFi:**
Hold RESET button for 3 seconds → Clears credentials, restarts in AP mode
