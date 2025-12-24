# VeaHome Mesh Network - Quick Start Guide

## For Users: How to Use

### Normal Operation (Cloud Mode)
1. **Device setup:** Connect device via BLE (open app → scan for "SmartMonitor_X")
2. **WiFi configuration:** Enter your home WiFi credentials
3. **Done!** Device connects to cloud, works from anywhere

### When Internet Goes Down (Mesh Mode)
1. **Setup VeaHub once:** Follow "Setting Up VeaHub" below
2. **Devices auto-switch:** When home internet fails, all devices automatically connect to "veahub" WiFi
3. **Keep using app:** Connect your phone to "veahub" WiFi
4. **Full local control:** Devices work normally, automations run on VeaHub
5. **Auto-recover:** When internet returns, devices reconnect to home WiFi automatically

### Emergency Mode (No WiFi at All)
1. **Open app:** Go to Devices screen
2. **Tap device:** App automatically switches to BLE mode
3. **Control device:** Turn buzzer on/off, adjust thresholds
4. **Read sensors:** View live temperature, humidity, dust, gas levels

---

## Setting Up VeaHub

### Option 1: Raspberry Pi (Recommended)

**What you need:**
- Raspberry Pi 3B+ or 4 (any model with WiFi)
- MicroSD card (16GB minimum)
- Power supply
- Ethernet cable (optional, for initial setup)

**Step-by-step:**

1. **Install Raspberry Pi OS Lite**
   - Download from https://www.raspberrypi.com/software/
   - Use Raspberry Pi Imager to write to SD card
   - Enable SSH in imager settings

2. **Boot Pi and connect via SSH**
   ```bash
   ssh pi@raspberrypi.local
   # Default password: raspberry
   ```

3. **Run automated setup script**
   ```bash
   # Download and run VeaHub installer
   curl -o veahub-setup.sh https://raw.githubusercontent.com/yourusername/veahome/main/scripts/veahub-setup.sh
   chmod +x veahub-setup.sh
   sudo ./veahub-setup.sh
   ```

4. **Reboot**
   ```bash
   sudo reboot
   ```

5. **Done!** Look for "veahub" WiFi network
   - SSID: **veahub**
   - Password: **vealive360**
   - VeaHub IP: **192.168.10.1**
   - Web Interface: http://192.168.10.1

**Manual Setup (if script fails):**
See [MESH_ARCHITECTURE.md](MESH_ARCHITECTURE.md) for detailed instructions.

---

### Option 2: ESP32 Coordinator (Advanced)

**What you need:**
- ESP32 development board
- USB cable for programming
- Arduino IDE or PlatformIO

**Steps:**
1. Open Arduino IDE
2. Install ESP32 board support
3. Load `firmware/veahub/veahub_coordinator.cpp`
4. Select "ESP32 Dev Module" board
5. Upload firmware
6. Done! ESP32 creates "veahub" WiFi network

**Configuration:**
- Connect to "veahub" WiFi
- Open http://192.168.10.1
- Configure automations via web interface

---

## Testing the Mesh

### Test 1: Normal Cloud Operation
1. Ensure device connected to home WiFi
2. Open app → see device status "ONLINE" (green)
3. Control buzzer → should respond instantly
4. Check device screen → top bar normal color

### Test 2: Switch to Mesh
1. Unplug your home router OR disable WAN on router
2. Wait 30 seconds
3. Device screen changes:
   - Top bar turns **BLUE**
   - Shows **"MESH"** label
   - Footer shows **"veahub (mesh)"**
4. Connect phone to "veahub" WiFi (password: vealive360)
5. Open app → device still works!
6. Control buzzer → works via local network

### Test 3: Cloud Recovery
1. Restore internet (plug router back in)
2. Wait 30 seconds
3. Device auto-reconnects to home WiFi
4. Top bar returns to normal color
5. Status shows "ONLINE"

### Test 4: BLE Fallback
1. Turn off VeaHub (or unplug it)
2. Device shows **"Offline (BLE)"** in footer
3. Blue LED on device
4. Open app → tap device
5. App says "Connecting via Bluetooth..."
6. Control buzzer via BLE → works!

---

## Creating Local Automations

### Via VeaHub Web Interface

1. **Connect to VeaHub WiFi**
   - SSID: veahub
   - Password: vealive360

2. **Open web interface**
   - URL: http://192.168.10.1 or http://veahub.local

3. **Go to Automations page**
   - Click "Manage Automations"

4. **Add a rule**
   - **Source Topic:** `vealive/smartmonitor/1/telemetry`
   - **Condition:** `temp > 30`
   - **Target Topic:** `vealive/smartplug/2/command/state`
   - **Payload:** `{"state":"OFF"}`
   - Click "Add Rule"

5. **Test it**
   - Heat up SmartMonitor (blow hot air on sensor)
   - When temp > 30°C, smart plug turns OFF automatically
   - Works offline!

### Example Automations

**Turn on fan when temperature high:**
```
Source: vealive/smartmonitor/1/telemetry
Condition: temp > 28
Target: vealive/smartplug/5/command/state
Payload: {"state":"ON"}
```

**Alert when dust level high:**
```
Source: vealive/smartmonitor/1/telemetry
Condition: dust > 300
Target: vealive/buzzer/1/command/alert
Payload: {"type":"dust","value":350}
```

**Turn off all devices at night:**
```
Source: vealive/time/local
Condition: hour == 23
Target: vealive/all/command/state
Payload: {"state":"OFF"}
```

---

## Troubleshooting

### Device not appearing in app
**Cloud mode:**
- Check device connected to WiFi (check screen)
- Verify internet connection on home WiFi
- Check device status LED (should be green)

**Mesh mode:**
- Verify VeaHub is running (scan for "veahub" WiFi)
- Connect phone to "veahub" WiFi
- Device screen should show "MESH" in blue

**BLE mode:**
- Enable Bluetooth on phone
- Grant location permissions (Android)
- Be within 10m of device
- Look for "SmartMonitor_X" in BLE scan

### VeaHub not visible
**Raspberry Pi:**
```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Check services
sudo systemctl status hostapd
sudo systemctl status mosquitto

# Restart if needed
sudo systemctl restart hostapd
sudo systemctl restart mosquitto
```

**ESP32:**
- Check Serial Monitor for errors
- Verify ESP32 powered on
- Red LED should be lit

### Automations not working
1. **Check rule syntax:**
   - Condition format: `fieldname > value`
   - Valid operators: `>`, `<`, `==`, `>=`, `<=`

2. **Verify MQTT messages:**
   ```bash
   # On Raspberry Pi VeaHub
   mosquitto_sub -h localhost -t '#' -v
   # Should see device telemetry messages
   ```

3. **Check web interface:**
   - http://192.168.10.1/stats
   - Verify devices connected

### Device stuck in BLE mode
**Solution:**
1. Connect to device via BLE
2. Send WiFi credentials again
3. Or reset device (hold reset button 2 seconds)
4. Reconfigure via BLE

---

## App Configuration

### Detect Mesh Mode Automatically

The app should detect which mode to use:

```javascript
// In your app's connection logic
async function autoConnect() {
  try {
    // Try cloud first
    const response = await fetch('https://your-api.com/health');
    if (response.ok) {
      return connectCloud();
    }
  } catch (e) {
    // Cloud failed, try mesh
  }
  
  try {
    // Try mesh MQTT
    const meshClient = await connectMQTT('192.168.10.1', 1883);
    if (meshClient.connected) {
      return useMeshMode(meshClient);
    }
  } catch (e) {
    // Mesh failed, use BLE
  }
  
  // Fall back to BLE
  return useBLEMode();
}
```

---

## Security Tips

### Change Default Password
**VeaHub WiFi:**
```bash
# Edit hostapd config
sudo nano /etc/hostapd/hostapd.conf
# Change: wpa_passphrase=vealive360
# To: wpa_passphrase=YOUR_STRONG_PASSWORD
sudo systemctl restart hostapd
```

### Add MQTT Authentication
```bash
# Create password file
sudo mosquitto_passwd -c /etc/mosquitto/passwd veahub
# Enter password when prompted

# Edit mosquitto config
sudo nano /etc/mosquitto/mosquitto.conf
# Add:
allow_anonymous false
password_file /etc/mosquitto/passwd

sudo systemctl restart mosquitto
```

### Firewall (Optional)
```bash
# Only allow mesh network access
sudo ufw enable
sudo ufw allow from 192.168.10.0/24 to any port 1883
sudo ufw allow from 192.168.10.0/24 to any port 80
```

---

## Performance Tips

### Optimize MQTT
- Keep messages small (< 512 bytes)
- Use retained messages for device status
- Publish telemetry at 2-second intervals (already optimized)

### Optimize WiFi
- Use 2.4GHz for better range
- Channel 1, 6, or 11 (avoid overlap)
- Keep VeaHub central in home

### Multiple VeaHubs
For large homes:
1. Set up VeaHub in each zone
2. Use different channels (1, 6, 11)
3. Same SSID and password
4. Devices auto-roam to strongest signal

---

## Next Steps

1. **Set up VeaHub** using Option 1 (Raspberry Pi)
2. **Test mesh switching** by unplugging router
3. **Create automations** via web interface
4. **Add more devices** to mesh network
5. **Monitor via web dashboard** at http://192.168.10.1

For detailed technical information, see [MESH_ARCHITECTURE.md](MESH_ARCHITECTURE.md)
