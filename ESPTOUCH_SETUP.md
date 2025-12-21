# ESPTouch (SmartConfig) Setup - ZERO Manual Steps!

## What is ESPTouch?
- Phone stays on HOME WiFi (no switching!)
- Phone broadcasts encrypted WiFi credentials
- ESP32 captures them in promiscuous mode
- Device automatically connects
- Used by Tuya, Xiaomi, all major IoT brands

## Implementation Steps:

### 1. ESP32 Firmware (Update existing firmware)
```cpp
#include <WiFi.h>
#include "esp_smartconfig.h"

// Add SmartConfig state
bool smartConfigRunning = false;

void startSmartConfig() {
  WiFi.mode(WIFI_STA);
  WiFi.beginSmartConfig();
  smartConfigRunning = true;
  Serial.println("[SmartConfig] Started - waiting for credentials...");
}

void handleSmartConfig() {
  if (!smartConfigRunning) return;
  
  if (WiFi.smartConfigDone()) {
    Serial.println("[SmartConfig] Credentials received!");
    smartConfigRunning = false;
    
    // Save credentials
    ssid = WiFi.SSID();
    password = WiFi.psk();
    savePrefs();
    
    Serial.printf("[SmartConfig] Connecting to: %s\n", ssid.c_str());
    // WiFi already connecting automatically
  }
}

// In setup(), if no WiFi saved:
if (!loadPrefs()) {
  startSmartConfig();
  return;
}

// In loop():
handleSmartConfig();
```

### 2. React Native App (Install package)
```bash
npm install react-native-smartconfig-x
```

### 3. Update DeviceProvisioningWizard.tsx
```tsx
import SmartConfig from 'react-native-smartconfig-x';
import NetInfo from '@react-native-community/netinfo';

const provisionDevice = async () => {
  try {
    setIsProcessing(true);
    setStatusMessage('Broadcasting WiFi credentials...');

    // Get current WiFi SSID from phone
    const netInfo = await NetInfo.fetch();
    const currentSSID = netInfo.details?.ssid;

    // Start SmartConfig broadcasting
    const result = await SmartConfig.start({
      type: 'esptouch',
      ssid: homeWifiSSID,
      bssid: currentSSID, // Phone's current network
      password: homeWifiPassword,
      timeout: 60000, // 60 seconds
    });

    if (result.success) {
      setStatusMessage('✓ Device configured!');
      setCurrentStep('success');
    } else {
      throw new Error('SmartConfig timeout');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setIsProcessing(false);
    SmartConfig.stop();
  }
};
```

### 4. New User Flow (AUTOMATIC!)
```
Step 1: User enters WiFi password in app
  ↓
Step 2: Click "Configure Device"
  ↓
Step 3: Phone broadcasts credentials
  ↓
Step 4: ESP32 receives and connects
  ↓
Step 5: Done! ✓

NO MANUAL WIFI SWITCHING!
```

## Advantages:
✅ User stays on home WiFi entire time
✅ No manual WiFi switching
✅ Works on iOS & Android
✅ Industry standard (Tuya/Xiaomi use this)
✅ Secure (uses AES encryption)
✅ Fast (~5-10 seconds)

## Install Now:
```bash
cd VeaHome
npm install react-native-smartconfig-x @react-native-community/netinfo
npx pod-install  # iOS only
```

Then I'll update the firmware and app code!
