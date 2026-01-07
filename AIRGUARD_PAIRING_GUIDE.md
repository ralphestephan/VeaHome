# AirGuard Pairing Guide - Complete Walkthrough

This guide walks you through pairing an AirGuard device from scratch, step by step.

## Prerequisites

1. **Physical Setup:**
   - AirGuard device powered on (plugged in)
   - Device should be in **BLE Pairing Mode** (shows "BLE Pairing Mode" on screen)
   - If device shows WiFi setup screen, it's already in AP mode (also works)

2. **App Requirements:**
   - VeaHome app installed and logged in
   - Bluetooth enabled on your phone
   - Location permissions granted (required for BLE scanning)
   - WiFi network name and password ready

---

## Step-by-Step Pairing Process

### Step 1: Start the Pairing Flow

1. **Open VeaHome App**
   - Navigate to the **Devices** tab (bottom navigation)

2. **Tap "Add Device" Button**
   - Located at the top right of the Devices screen
   - A modal will appear with options

3. **Select "Vealive Device"**
   - From the modal, choose "Vealive Device"
   - Another modal appears with device types

4. **Select "AirGuard"**
   - Tap the "AirGuard" option
   - This navigates to the BLE Device Wizard

---

### Step 2: BLE Device Discovery

The app will now:

1. **Request Permissions**
   - Bluetooth permission
   - Location permission (required for BLE on Android)
   - Grant all permissions when prompted

2. **Scan for BLE Devices**
   - App automatically starts scanning
   - Look for devices named `SmartMonitor_1`, `SmartMonitor_2`, etc.
   - The device ID number matches the `DEVICE_ID` in the firmware

3. **Select Your AirGuard**
   - Tap on the device from the list
   - Device info will show:
     - **Device ID**: The numeric ID (e.g., "1", "2")
     - **Name**: SmartMonitor_X
     - **Type**: SmartMonitor

---

### Step 3: WiFi Network Selection

1. **Device Scans WiFi Networks**
   - After connecting via BLE, the device scans available WiFi networks
   - Networks appear in a list with signal strength

2. **Select Your WiFi Network**
   - Tap on your home WiFi network from the list
   - Or manually enter the SSID if it doesn't appear

3. **Enter WiFi Password**
   - Enter your WiFi password
   - Make sure it's correct (case-sensitive)

---

### Step 4: Device Configuration

1. **Enter Device Name**
   - Default: "AirGuard" or "AirGuard {ID}"
   - You can customize it (e.g., "Living Room AirGuard")

2. **Select Room**
   - Choose which room to assign the device to
   - This helps organize devices in your home

3. **Review Device ID**
   - The SmartMonitor ID is shown (e.g., "1")
   - This is important for MQTT topics and device identification

---

### Step 5: WiFi Provisioning

1. **BLE Provisioning Starts**
   - App sends WiFi credentials via Bluetooth
   - Progress messages appear:
     - "Connecting via Bluetooth..."
     - "Sending WiFi credentials..."
     - "Device connecting to WiFi..."

2. **Device Connects to WiFi**
   - AirGuard connects to your WiFi network
   - Blue LED should stop blinking when connected
   - Device screen updates to show sensor readings

3. **MQTT Connection**
   - Device automatically connects to MQTT broker
   - Publishes online status
   - Starts sending telemetry data

---

### Step 6: Device Registration

1. **Device Saved to Database**
   - App creates device record in your home
   - Links device to selected room
   - Stores SmartMonitor ID for future reference

2. **Success Screen**
   - "Device Added Successfully!" message
   - Option to "Go to Dashboard" or "Add Another Device"

---

### Step 7: Verify Connection

1. **Check Device Status**
   - Go to Devices screen
   - Your AirGuard should appear with:
     - ✅ Online status (green dot)
     - Current sensor readings (temp, humidity, etc.)
     - Room assignment

2. **View Device Details**
   - Tap on the AirGuard device
   - Modal opens showing:
     - Live sensor data
     - Alert status
     - Threshold settings
     - Mute button

---

## Adding IR/RF Devices to AirGuard

After AirGuard is paired, you can add devices it controls:

### Adding AC (IR)

1. **Navigate to AirGuard Device**
   - Tap on your AirGuard device
   - Look for "Add IR/RF Device" option (or navigate from Devices screen)

2. **Select Device Type**
   - Choose "Air Conditioner"
   - Or navigate directly: `IRRFDeviceOnboarding` with `deviceType: 'ac'`

3. **Configure Device**
   - Enter name (e.g., "Living Room AC")
   - Select room
   - Device is created and linked to AirGuard

4. **Control AC**
   - Tap the AC device in room
   - Opens AC Control screen with:
     - Temperature dial
     - Mode selector (Cool/Heat/Auto/Fan)
     - Power toggle

### Adding Shutters (RF)

1. **Same flow as AC**
   - Select "Shutters" as device type
   - Configure name and room

2. **Control Shutters**
   - Tap shutters device
   - Opens Shutters Control screen with:
     - Open/Close/Stop buttons
     - Status display

### Adding Dehumidifier (RF)

1. **Same flow**
   - Select "Dehumidifier" as device type
   - Configure name and room

2. **Control Dehumidifier**
   - Tap dehumidifier device
   - Opens Dehumidifier Control screen with:
     - Level dial (1-5)
     - Power toggle
     - Level indicators

---

## Troubleshooting

### Device Not Found in BLE Scan

**Possible Causes:**
- Device not powered on
- Device not in BLE mode (check screen)
- Bluetooth disabled on phone
- Location permission denied
- Device too far away

**Solutions:**
- Power cycle the device
- Check device screen shows "BLE Pairing Mode"
- Enable Bluetooth and location
- Move closer to device
- Restart BLE scan

### WiFi Provisioning Fails

**Possible Causes:**
- Wrong WiFi password
- WiFi network not in range
- Device can't connect to 2.4GHz network (5GHz not supported)
- MQTT broker unreachable

**Solutions:**
- Double-check WiFi password (case-sensitive)
- Ensure device is near router
- Use 2.4GHz WiFi network
- Check MQTT broker settings in firmware

### Device Shows Offline After Pairing

**Possible Causes:**
- WiFi connection lost
- MQTT broker not connected
- Device ID mismatch

**Solutions:**
- Check WiFi connection on device
- Verify MQTT broker address in firmware
- Check device ID matches in app and firmware
- Restart device

---

## Device Identification

### How Device ID Works

1. **Firmware Level:**
   - `DEVICE_ID` constant in `firmware_v3.cpp` (default: 1)
   - Can be changed before flashing
   - Stored in Preferences after first setup

2. **BLE Name:**
   - Format: `SmartMonitor_{DEVICE_ID}`
   - Example: `SmartMonitor_1`, `SmartMonitor_2`
   - Visible during BLE scan

3. **MQTT Topics:**
   - All topics include device ID: `vealive/smartmonitor/{ID}/...`
   - Example: `vealive/smartmonitor/1/telemetry`

4. **Database:**
   - Device stored with `smartMonitorId` in metadata
   - Used to identify which AirGuard to control

### Changing Device ID

If you need multiple AirGuards:

1. **Before First Pairing:**
   - Edit `firmware_v3.cpp`
   - Change `DEVICE_ID` constant
   - Flash firmware to device

2. **After Pairing:**
   - Device ID is stored in Preferences
   - Can be changed via BLE or reset device

---

## Complete Flow Diagram

```
User Action                    App Screen                    Device State
─────────────────────────────────────────────────────────────────────────
1. Tap "Add Device"    →    DevicesScreen
2. Select "Vealive"    →    Add Device Modal
3. Select "AirGuard"   →    BLEDeviceWizard
4. Grant Permissions   →    Permission Requests
5. BLE Scan            →    Device List              BLE Pairing Mode
6. Select Device       →    Device Info              BLE Connected
7. Select WiFi         →    WiFi Network List        Scanning WiFi
8. Enter Password      →    Password Input
9. Start Provisioning  →    Provisioning Progress    Receiving Credentials
10. Device Connects    →    Success Screen           WiFi Connected
11. Device Registered  →    Dashboard                MQTT Connected
12. Add IR/RF Devices  →    IRRFDeviceOnboarding     Ready for Commands
```

---

## Quick Reference

### Navigation Paths

- **Start Pairing:** `DevicesScreen` → "Add Device" → "Vealive Device" → "AirGuard"
- **Add AC:** Navigate to AirGuard → "Add IR/RF Device" → "AC"
- **Add Shutters:** Navigate to AirGuard → "Add IR/RF Device" → "Shutters"
- **Add Dehumidifier:** Navigate to AirGuard → "Add IR/RF Device" → "Dehumidifier"

### MQTT Topics (Device ID = 1)

- **Telemetry:** `vealive/smartmonitor/1/telemetry`
- **Status:** `vealive/smartmonitor/1/status`
- **AC Command:** `vealive/smartmonitor/1/command/ac`
- **Shutters Command:** `vealive/smartmonitor/1/command/shutters`
- **Dehumidifier Command:** `vealive/smartmonitor/1/command/dehumidifier`
- **Learn IR:** `vealive/smartmonitor/1/command/learn/ir`
- **Learn RF:** `vealive/smartmonitor/1/command/learn/rf`

### BLE Characteristics

- **Service UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Device Info:** `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e` (Read)
- **WiFi List:** `beb5483e-36e1-4688-b7f5-ea07361b26a8` (Read/Notify)
- **WiFi Credentials:** `cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f` (Write)

---

## Next Steps After Pairing

1. **Configure Thresholds**
   - Open AirGuard device
   - Tap "Threshold Settings"
   - Set min/max values for alerts

2. **Add IR/RF Devices**
   - Follow the IR/RF device onboarding flow
   - Learn remote codes (optional)
   - Start controlling devices

3. **Set Up Scenes**
   - Create scenes that include AirGuard devices
   - Automate climate control

4. **Monitor Data**
   - View real-time sensor readings
   - Check device history
   - Set up alerts

---

## Support

If you encounter issues:
1. Check device screen for error messages
2. Review MQTT broker connection
3. Verify WiFi credentials
4. Check device ID matches in all places
5. Restart device and try again

