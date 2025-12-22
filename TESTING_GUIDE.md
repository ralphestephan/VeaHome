# Quick Test Guide - BLE Device Onboarding

## Prerequisites
- Physical iOS or Android device (BLE doesn't work in simulators)
- ESP32 with firmware_v3.cpp flashed
- ESP32 powered on with no saved WiFi (will start in BLE mode)

## Test Steps

### 1. Flash Firmware (if not done)
```bash
# Using Arduino IDE
1. Open firmware/firmware_v3.cpp
2. Select Board: ESP32 Dev Module
3. Upload to ESP32
4. Open Serial Monitor (115200 baud)
5. Should see: "[BLE] Starting BLE provisioning mode"
```

### 2. Build App on Physical Device
```bash
# For iOS
npx expo run:ios --device

# For Android
npx expo run:android --device

# Note: Use --device flag for physical device
```

### 3. Test BLE Flow
1. **Open App** on physical device
2. **Navigate**: Bottom tab → Devices screen
3. **Add Device**: Tap "Add Device" button (top right)
4. **Select Type**: Choose "Vealive Device"
5. **Choose Method**: Tap "AirGuard (BLE Setup)"

### 4. Grant Permissions
You'll see permission requests:
- ✅ Location (required for BLE scan on Android)
- ✅ Bluetooth (required to connect)
- ✅ Local Network (recommended)

**Tap "Continue" after granting all**

### 5. Device Discovery
- Scanning screen appears with spinner
- After ~3-5 seconds: "SmartMonitor_1" appears
- Check ESP32 display shows "BLE Pairing Mode"

### 6. Connect to Device
- Tap on "SmartMonitor_1" in the list
- Status shows "Connecting..."
- After ~2 seconds: "Connected!"

### 7. WiFi Network Selection
- List of WiFi networks appears
- Should show networks from ESP32 scan
- Select your 2.4GHz WiFi network

### 8. Enter Credentials
- Password field appears
- Enter your WiFi password
- Tap "Next" button

### 9. Provisioning
- Status: "Sending WiFi credentials..."
- ESP32 receives credentials
- ESP32 restarts automatically
- Check Serial Monitor: "[BLE] Received WiFi credentials"

### 10. Success
- Success screen appears with checkmark
- ESP32 connects to WiFi
- Device added to backend
- Tap "Done" to return to devices list

## Expected Serial Monitor Output

```
=== Vealive360 SmartMonitor v3 ===
Device ID: 1
Client ID: SM1_A1B2C3D4
[PREF] No WiFi saved. Starting BLE provisioning.
[BLE] Starting BLE provisioning mode
[BLE] Advertising started
[BLE] Device name: SmartMonitor_1
[BLE] Found 5 WiFi networks
[BLE] Client connected
[BLE] Received WiFi credentials
[BLE] SSID: YourWiFiName
Restarting...

=== Vealive360 SmartMonitor v3 ===
[WiFi] Connecting to: YourWiFiName
[WiFi] Connected! IP: 192.168.1.123 RSSI: -45
[MQTT] Connecting to 63.34.243.171:1883...
[MQTT] Connected!
```

## Troubleshooting

### No Devices Found
**Problem**: Scan completes but no devices shown

**Solutions**:
- Check ESP32 is powered on
- Verify ESP32 display shows "BLE Pairing Mode"
- Ensure Bluetooth is enabled on phone
- Grant Location permission (Settings → VeaHome → Location → Always/While Using)
- Move phone closer to ESP32 (<5m)

**Check ESP32 Serial**:
```
Should see: [BLE] Advertising started
```

### Connection Failed
**Problem**: "Could not connect to device" error

**Solutions**:
- ESP32 may be too far (move within 3m)
- Restart ESP32 (power cycle)
- Close and reopen app
- Disable/enable Bluetooth on phone

### No WiFi Networks
**Problem**: Network list is empty

**Solutions**:
- ESP32 scans on startup only
- Restart ESP32 to rescan
- Check ESP32 has WiFi antenna connected
- Move ESP32 closer to router

### Provisioning Failed
**Problem**: "Could not send credentials" error

**Solutions**:
- Check WiFi password is correct
- Ensure network is 2.4GHz (ESP32 doesn't support 5GHz)
- Verify network uses WPA/WPA2 (not WEP or Open)
- Check network SSID has no special characters

### Device Won't Connect to WiFi
**Problem**: ESP32 restarts but doesn't connect

**Check Serial Monitor**:
```
[WiFi] Connection lost...
[WiFi] Fallback to AP mode
```

**Solutions**:
- Wrong password → Hold reset button 2s to clear
- 5GHz network → Use 2.4GHz network
- Hidden SSID → Make network visible
- MAC filtering → Add ESP32 MAC to router whitelist

## Success Indicators

### ESP32 Display:
```
Before Provisioning:
┌──────────────────────┐
│  BLE Pairing Mode    │
│ Open VeaHome app to  │
│      connect         │
└──────────────────────┘

After Provisioning:
┌──────────────────────┐
│   Vealive360    ID:1 │
│      12:34           │
│        OK            │
│  25°C  55%  120  40  │
│  TEMP  HUM DUST GAS  │
│  HomeWiFi      ●●●●  │
└──────────────────────┘
```

### Mobile App:
- ✅ Success screen with green checkmark
- ✅ "Device connected successfully!"
- ✅ Device appears in devices list
- ✅ Real-time sensor data visible

## Performance Benchmarks

| Step | Expected Time |
|------|---------------|
| BLE Scan | 3-10 seconds |
| Connection | 1-3 seconds |
| WiFi Scan | 0-2 seconds (cached) |
| Credential Write | <1 second |
| ESP32 Restart | 3-5 seconds |
| WiFi Connect | 5-10 seconds |
| **Total** | **~30 seconds** |

## Quick Reset

To test again from scratch:

**ESP32:**
- Hold reset button for 2 seconds
- OR Flash firmware again

**App:**
- Delete device from devices list
- Start flow again

## Video Test Recording

Recommended to record screen while testing:
- iOS: Settings → Control Center → Screen Recording
- Android: Swipe down → Screen Recorder

This helps identify any UX issues or timing problems.

## Next: Production Testing

Once working in development:
1. Build release APK/IPA
2. Test on multiple device models
3. Test in different WiFi environments
4. Test with weak signals
5. Test error recovery paths

## Support

If issues persist:
1. Check `BLE_COMPLETE.md` for detailed troubleshooting
2. Review Serial Monitor output
3. Check app logs in Metro bundler
4. Verify BLE permissions in phone settings
