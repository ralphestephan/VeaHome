# VeaHome Mesh Network Architecture

## Overview
VeaHome uses a **3-tier fallback network** for offline-first smart home control:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUD (Internet)                          │
│  AWS EC2: MQTT Broker, Backend API, Database                    │
└────────────────┬────────────────────────────────────────────────┘
                 │ Internet
                 │ (Tier 1: Home WiFi with Internet)
┌────────────────▼────────────────────────────────────────────────┐
│                         HOME NETWORK                             │
│  Router: User's home WiFi (e.g., "MyHomeWiFi")                  │
│  - All devices connect when internet available                   │
│  - Full cloud features: remote access, history, analytics        │
└────────────────┬────────────────────────────────────────────────┘
                 │ Internet Failure
                 │ (Tier 2: VeaHub Mesh)
┌────────────────▼────────────────────────────────────────────────┐
│                       VEAHUB MESH AP                             │
│  SSID: "veahub"  |  Password: "vealive360"                      │
│  - Raspberry Pi or ESP32 acting as WiFi AP                      │
│  - Local MQTT Broker (Mosquitto) on 192.168.10.1:1883          │
│  - Local automation engine                                       │
│  - Devices communicate via local MQTT                            │
└────────────────┬────────────────────────────────────────────────┘
                 │ No VeaHub Available
                 │ (Tier 3: Direct BLE)
┌────────────────▼────────────────────────────────────────────────┐
│                    BLUETOOTH MESH (BLE)                          │
│  - Phone app connects directly to devices via BLE               │
│  - Device-to-device BLE mesh for automation                     │
│  - Fully offline, no infrastructure needed                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Tier 1: Cloud Mode (Normal Operation)
**When:** Home WiFi has internet connection

**Device Behavior:**
1. Device connects to home WiFi (e.g., "MyHomeWiFi")
2. Connects to cloud MQTT broker (63.34.243.171:1883)
3. Publishes telemetry every 2 seconds
4. Listens for commands from cloud
5. Green LED indicates "ONLINE"

**User Control:**
- Mobile app → Cloud API → MQTT → Device
- Full features: remote access, history, automations
- Works from anywhere with internet

---

### Tier 2: VeaHub Mesh (Internet Failure)
**When:** Home internet down, but VeaHub is running

**Device Behavior:**
1. Detects home WiFi has no internet
2. Automatically connects to "veahub" AP (password: vealive360)
3. Gets IP in 192.168.10.x subnet
4. Connects to local MQTT broker (192.168.10.1:1883)
5. Publishes telemetry locally
6. Top bar turns BLUE, shows "MESH"

**User Control:**
- Phone connects to "veahub" WiFi
- Mobile app detects mesh mode
- App → Local MQTT (192.168.10.1) → Device
- Local automations run on VeaHub
- No internet needed, works fully offline

**What is VeaHub?**
VeaHub is a device that provides:
- WiFi Access Point ("veahub" SSID)
- Local MQTT Broker (Mosquitto)
- Local automation engine
- Device coordination

**VeaHub Hardware Options:**
1. **Raspberry Pi 3/4** (recommended)
   - Runs Raspbian with hostapd + Mosquitto
   - Can run Node-RED for local automations
   
2. **ESP32 with Ethernet**
   - Lightweight mesh coordinator
   - Runs AP + simple MQTT broker

---

### Tier 3: Direct BLE (No Infrastructure)
**When:** No WiFi available at all

**Device Behavior:**
1. WiFi connection fails
2. BLE advertising stays active
3. Shows "Offline (BLE)" in footer
4. Blue LED indicates offline mode
5. Sensors still work, local automations active

**User Control:**
- Phone's Bluetooth connects directly to device
- App scans for nearby BLE devices
- Direct BLE commands (no WiFi/MQTT needed)
- Control: Buzzer on/off, threshold changes
- Read: Live sensor data via BLE notifications

---

## Device-to-Device Communication

### Scenario: Temperature sensor triggers smart plug

**Option A: Via VeaHub Mesh (Tier 2)**
```
AirGuard (temp > 30°C)
   │
   ▼ MQTT publish to: veahub/automation/temp-alert
VeaHub (192.168.10.1)
   │ Local automation rule: if temp > 30, turn off AC plug
   ▼ MQTT publish to: vealive/smartplug/2/command/state
SmartPlug (receives command)
   │
   ▼ Turns OFF
```

**Option B: Via BLE Mesh (Tier 3)**
```
AirGuard (temp > 30°C)
   │ Local rule: "if temp > 30, broadcast BLE command"
   ▼ BLE advertise: {"event":"temp_high","value":32}
SmartPlug (scanning for BLE mesh packets)
   │ Local rule: "if temp_high event, turn off"
   ▼ Turns OFF
```

---

## BLE Mesh Protocol

### BLE Service UUID
```
Service: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
```

### Characteristics

**1. Device Info** (Read)
```
UUID: 1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e
Format: {"deviceId":1,"name":"SmartMonitor_1","type":"SmartMonitor"}
```

**2. WiFi Networks** (Read/Notify)
```
UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
Format: [{"ssid":"MyWiFi","signal":-45,"secured":true},...]
```

**3. WiFi Credentials** (Write/Notify)
```
UUID: cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f
Write: {"ssid":"MyWiFi","password":"mypass123"}
Response: {"success":true,"message":"Connected"}
```

**4. Control Commands** (Write/Notify)
```
UUID: 2c45e8f6-9a3d-4e1b-b7c4-8f9d3e2a1b5c

Commands:
- Buzzer: {"buzzer":"ON"} or {"buzzer":"OFF"}
- Thresholds: {"thresholds":{"tempMin":18,"tempMax":30,...}}
- Read State: {"command":"getState"}

Response: {"success":true,"temp":25,"hum":60,...}
```

**5. Mesh Broadcast** (Notify) - NEW
```
UUID: 3f8c9d7e-4a2b-5c1d-9e8f-7a6b5c4d3e2f

Format: {"event":"temp_high","deviceId":1,"value":32,"timestamp":1234567890}

Events:
- temp_high, temp_low
- hum_high, hum_low
- dust_alert, gas_alert
- motion_detected
- door_opened
```

---

## Local Automation Rules

### Stored on Device (Preferences)
```cpp
struct AutomationRule {
  bool enabled;          // Is rule active?
  int triggerType;       // 0=temp, 1=hum, 2=dust, 3=mq2, 4=time
  int condition;         // 0=above, 1=below, 2=equals
  int value;            // Threshold value
  int action;           // 0=buzzer_on, 1=buzzer_off, 2=ble_broadcast
  char bleCommand[64];  // BLE command to broadcast
};
```

### Example Rules
```json
// Rule 1: If temp > 30°C, turn buzzer on
{
  "enabled": true,
  "triggerType": 0,     // Temperature
  "condition": 0,       // Above
  "value": 30,
  "action": 0           // Buzzer ON
}

// Rule 2: If dust > 400, broadcast BLE alert
{
  "enabled": true,
  "triggerType": 2,     // Dust
  "condition": 0,       // Above
  "value": 400,
  "action": 2,          // BLE broadcast
  "bleCommand": "{\"event\":\"dust_alert\",\"value\":450}"
}
```

---

## Mobile App Integration

### Connection Logic (Pseudocode)
```javascript
async function connectToDevices() {
  // Step 1: Try cloud connection
  if (await testCloudConnection()) {
    mode = "CLOUD";
    useCloudAPI();
    return;
  }
  
  // Step 2: Try VeaHub mesh
  const meshWifi = await scanWiFi("veahub");
  if (meshWifi) {
    await connectWiFi("veahub", "vealive360");
    if (await testLocalMQTT("192.168.10.1:1883")) {
      mode = "MESH";
      useLocalMQTT();
      return;
    }
  }
  
  // Step 3: Fall back to BLE
  mode = "BLE";
  const devices = await scanBLE();
  useDirectBLE(devices);
}
```

### Control via BLE
```javascript
// Connect to device
const device = await bleManager.connectToDevice(deviceId);
await device.discoverAllServicesAndCharacteristics();

// Send buzzer command
const controlChar = "2c45e8f6-9a3d-4e1b-b7c4-8f9d3e2a1b5c";
await device.writeCharacteristicWithResponseForService(
  BLE_SERVICE_UUID,
  controlChar,
  btoa(JSON.stringify({buzzer: "ON"}))
);

// Read response
device.monitorCharacteristicForService(
  BLE_SERVICE_UUID,
  controlChar,
  (error, char) => {
    const response = JSON.parse(atob(char.value));
    console.log("Device response:", response);
  }
);
```

---

## Network Transition Flow

### Internet Failure → Mesh Mode
```
1. Device detects WiFi connected but no internet
2. Waits 30 seconds (WIFI_RETRY_INTERVAL_MS)
3. Disconnects from home WiFi
4. Scans for "veahub" SSID
5. Connects with password "vealive360"
6. Gets IP via DHCP (192.168.10.x)
7. Connects to 192.168.10.1:1883 (local MQTT)
8. UI updates: Blue top bar, "MESH" label
9. Continues normal operation with local broker
```

### Mesh → Cloud Recovery
```
1. Device periodically tests home WiFi (every 30s)
2. Detects home WiFi has internet again
3. Disconnects from veahub
4. Reconnects to home WiFi
5. Connects to cloud MQTT (63.34.243.171:1883)
6. UI updates: Normal top bar, "ONLINE" status
7. Publishes buffered telemetry to cloud
```

---

## Setting Up VeaHub

### Option 1: Raspberry Pi (Full Featured)

**Hardware:**
- Raspberry Pi 3B+ or 4 (2GB+ RAM)
- MicroSD card (16GB+)
- Power supply

**Software Installation:**
```bash
# Install Raspbian Lite
# Configure as WiFi AP
sudo apt update
sudo apt install -y hostapd dnsmasq mosquitto mosquitto-clients

# Configure hostapd
sudo nano /etc/hostapd/hostapd.conf
# Add:
interface=wlan0
driver=nl80211
ssid=veahub
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=vealive360
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

# Configure static IP
sudo nano /etc/dhcpcd.conf
# Add:
interface wlan0
static ip_address=192.168.10.1/24
nohook wpa_supplicant

# Configure DHCP
sudo nano /etc/dnsmasq.conf
# Add:
interface=wlan0
dhcp-range=192.168.10.10,192.168.10.100,255.255.255.0,24h

# Configure Mosquitto
sudo nano /etc/mosquitto/mosquitto.conf
# Add:
listener 1883
allow_anonymous true

# Enable services
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl enable mosquitto

# Start services
sudo systemctl start hostapd
sudo systemctl start dnsmasq
sudo systemctl start mosquitto

# Test
mosquitto_sub -h localhost -t '#' -v
```

**Optional: Add Node-RED for Local Automations**
```bash
bash <(curl -sL https://raw.githubusercontent.com/node-red/linux-installers/master/deb/update-nodejs-and-nodered)
sudo systemctl enable nodered
sudo systemctl start nodered

# Access at http://192.168.10.1:1880
```

### Option 2: ESP32 as Simple Coordinator

See `firmware/veahub/veahub_coordinator.cpp` for lightweight implementation.

---

## Troubleshooting

### Device not connecting to VeaHub
1. Check VeaHub AP is broadcasting: `sudo iwlist wlan0 scan | grep veahub`
2. Verify password: "vealive360"
3. Check device logs for connection attempts
4. Ensure VeaHub DHCP is running: `sudo systemctl status dnsmasq`

### BLE not working
1. Enable Bluetooth in phone settings
2. Grant location permissions (Android requirement)
3. Device must be within 10m range
4. Check device is advertising: Use "nRF Connect" app to scan

### Local automations not triggering
1. Check rules are saved in device preferences
2. Verify rule conditions match sensor values
3. Check MQTT messages on VeaHub: `mosquitto_sub -h 192.168.10.1 -t '#'`
4. Ensure devices are on same network (192.168.10.x)

---

## Security Considerations

### VeaHub Mesh
- **Password Protected**: WPA2 with "vealive360"
- **Isolated Network**: No internet access, local only
- **Change Default Password**: Update in hostapd.conf
- **MQTT Authentication**: Add username/password in production

### BLE Security
- **Pairing Required**: Device must be in pairing mode
- **Encrypted**: BLE 4.2+ uses AES-128 encryption
- **Range Limited**: 10m maximum, requires physical proximity
- **Command Validation**: All JSON commands validated before execution

---

## Future Enhancements

1. **BLE Mesh Standard**: Upgrade to official Bluetooth Mesh spec
2. **Encrypted MQTT**: TLS/SSL for local and cloud communication
3. **OTA Updates**: Firmware updates via mesh network
4. **Multi-VeaHub**: Multiple coordinators for larger homes
5. **Energy Harvesting**: Solar-powered devices for outdoor use
6. **Voice Control**: Offline voice commands via VeaHub
