# BLE Device Onboarding - Implementation Guide

## Overview
This document explains how to complete the BLE device onboarding implementation to match the seamless MOES experience.

## Current Implementation
The `BLEDeviceWizard` component provides the UI flow matching MOES:
1. **Permissions**: Request Location, Bluetooth, Local Network
2. **BLE Scanning**: Discover nearby devices
3. **Device Selection**: Connect to chosen device
4. **Network Scan**: List available WiFi networks
5. **Credentials**: Enter WiFi password
6. **Provisioning**: Send credentials via BLE
7. **Success**: Confirm connection

## Required Dependencies

Install BLE library:
```bash
npm install react-native-ble-plx
expo install expo-device
```

For Android, update `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysUsageDescription": "Allow VeaHome to connect to your smart devices via Bluetooth",
          "bluetoothPeripheralUsageDescription": "Allow VeaHome to connect to your smart devices via Bluetooth"
        }
      ]
    ]
  }
}
```

## BLE Integration Steps

### 1. Update BLEDeviceWizard.tsx

Replace the mock BLE implementation with real scanning:

```typescript
import { BleManager, Device } from 'react-native-ble-plx';

// Initialize BLE Manager
const bleManager = new BleManager();

// Start actual BLE scan
const startBLEScan = async () => {
  setIsScanning(true);
  setStatusMessage('Searching for nearby devices...');
  setCurrentStep('scanning');

  try {
    bleManager.startDeviceScan(
      null, // Service UUIDs (null = scan all)
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('BLE Scan Error:', error);
          return;
        }

        if (device?.name?.includes('SmartMonitor') || device?.name?.includes('AirGuard')) {
          setDiscoveredDevices(prev => {
            const exists = prev.find(d => d.id === device.id);
            if (exists) return prev;
            
            return [...prev, {
              id: device.id,
              name: device.name || 'Unknown Device',
              rssi: device.rssi || -100
            }];
          });
        }
      }
    );

    // Stop scan after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      if (discoveredDevices.length > 0) {
        setCurrentStep('device-found');
      }
    }, 10000);

  } catch (error) {
    console.error('BLE Error:', error);
    setIsScanning(false);
  }
};
```

### 2. Connect to Device

```typescript
const connectToDevice = async (device: BLEDevice) => {
  setSelectedDevice(device);
  setStatusMessage(`Connecting to ${device.name}...`);
  setIsScanning(true);

  try {
    const connectedDevice = await bleManager.connectToDevice(device.id);
    await connectedDevice.discoverAllServicesAndCharacteristics();
    
    setIsScanning(false);
    setCurrentStep('network-scan');
    
    // Request WiFi networks from device
    requestWiFiNetworks(connectedDevice);
  } catch (error) {
    console.error('Connection Error:', error);
    Alert.alert('Connection Failed', 'Could not connect to device');
    setIsScanning(false);
  }
};
```

### 3. Request WiFi Networks via BLE

Your ESP32 firmware needs a BLE service for WiFi provisioning:

**Firmware Changes Needed (firmware_v3.cpp):**
```cpp
// Add BLE library
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE UUIDs (generate your own)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define WIFI_LIST_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define WIFI_CRED_CHAR_UUID "cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f"

BLEServer* pServer;
BLECharacteristic* pWifiListChar;
BLECharacteristic* pWifiCredChar;

// Scan WiFi networks and send to app
void sendWiFiNetworks() {
  int n = WiFi.scanNetworks();
  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"secured\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN) + "}";
  }
  json += "]";
  pWifiListChar->setValue(json.c_str());
  pWifiListChar->notify();
}

// Handle incoming WiFi credentials
class WiFiCredCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    
    // Parse JSON: {"ssid":"HomeWiFi","password":"password123"}
    StaticJsonDocument<256> doc;
    deserializeJson(doc, value);
    
    ssid = doc["ssid"].as<String>();
    password = doc["password"].as<String>();
    
    savePrefs();
    ESP.restart();
  }
};
```

**React Native BLE Code:**
```typescript
// Define UUIDs (must match firmware)
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const WIFI_LIST_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const WIFI_CRED_CHAR_UUID = 'cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f';

const requestWiFiNetworks = async (device: Device) => {
  // Read WiFi networks from device
  const networks = await device.readCharacteristicForService(
    SERVICE_UUID,
    WIFI_LIST_CHAR_UUID
  );
  
  const networksData = JSON.parse(atob(networks.value));
  setWifiNetworks(networksData);
};

const provisionDevice = async () => {
  // Send credentials to device via BLE
  const credentials = {
    ssid: selectedNetwork.ssid,
    password: wifiPassword
  };
  
  await connectedDevice.writeCharacteristicWithResponseForService(
    SERVICE_UUID,
    WIFI_CRED_CHAR_UUID,
    btoa(JSON.stringify(credentials))
  );
  
  setCurrentStep('provisioning');
  setStatusMessage('Device is connecting to WiFi...');
  
  // Device will restart - disconnect BLE
  await connectedDevice.cancelConnection();
  
  // Wait for device to connect to WiFi
  setTimeout(() => {
    setCurrentStep('success');
  }, 5000);
};
```

### 4. Android Permissions

Update `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 5. iOS Permissions

Update `ios/VeaHome/Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Allow VeaHome to connect to your smart devices via Bluetooth</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Allow VeaHome to connect to your smart devices via Bluetooth</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Allow VeaHome to discover nearby devices</string>
```

## Testing Steps

1. **Flash Updated Firmware**: Deploy BLE-enabled firmware to ESP32
2. **Build App**: `expo run:android` or `expo run:ios`
3. **Grant Permissions**: Allow all requested permissions
4. **Start Scan**: Device should appear as "SmartMonitor_1"
5. **Connect**: Tap device to connect via BLE
6. **View Networks**: WiFi networks should populate from device
7. **Enter Credentials**: Type WiFi password
8. **Provision**: Credentials sent via BLE
9. **Success**: Device restarts and connects to WiFi

## Alternative: Network Scan from Phone

If you prefer to scan WiFi networks from the phone instead of the device:

```bash
npm install react-native-wifi-reborn
```

```typescript
import WifiManager from 'react-native-wifi-reborn';

const scanWiFiNetworks = async () => {
  try {
    const networks = await WifiManager.loadWifiList();
    setWifiNetworks(networks.map(n => ({
      ssid: n.SSID,
      signal: n.level,
      secured: n.capabilities !== '[ESS]'
    })));
  } catch (error) {
    console.error('WiFi Scan Error:', error);
  }
};
```

## Production Considerations

1. **Security**: Encrypt WiFi credentials during BLE transfer
2. **Timeouts**: Add connection timeouts and retry logic
3. **Error Handling**: Graceful degradation if BLE unavailable
4. **Battery**: Stop BLE scan when not in use
5. **Device Filtering**: Only show SmartMonitor/AirGuard devices
6. **Signal Strength**: Show RSSI indicators for devices
7. **Multi-device**: Support adding multiple devices sequentially

## Fallback to AP Mode

Keep the existing `DeviceProvisioningWizard` as fallback:
- If BLE fails → suggest AP mode setup
- Add "Use Manual Setup" button in BLE wizard
- Manual setup uses HTTP provisioning at 192.168.4.1

## Resources

- [react-native-ble-plx docs](https://github.com/dotintent/react-native-ble-plx)
- [ESP32 BLE examples](https://github.com/espressif/arduino-esp32/tree/master/libraries/BLE)
- [Expo BLE guide](https://docs.expo.dev/guides/using-ble/)
