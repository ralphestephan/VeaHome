/**
 * WiFi Provisioning Service for Airguard Devices
 * 
 * This service handles seamless WiFi provisioning for Airguard devices:
 * 1. Scans for available WiFi networks matching device pattern
 * 2. Prompts user for WiFi permission
 * 3. Connects to device AP (SmartMonitor_Setup)
 * 4. Sends WiFi credentials via JSON API
 * 5. Receives device ID for authentication
 * 
 * Usage:
 *   const result = await provisionAirguard('AirGuard1', 'MyWiFi', 'password123');
 *   if (result.success) {
 *     console.log('Device ID:', result.deviceId);
 *   }
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

interface ProvisioningResult {
  success: boolean;
  deviceId?: number;
  error?: string;
  message?: string;
}

const DEVICE_AP_PREFIX = 'SmartMonitor_Setup';
const DEVICE_AP_IP = '192.168.4.1';
const PROVISIONING_ENDPOINT = '/api/provision';
const CONNECTION_TIMEOUT = 30000; // 30 seconds

/**
 * Request WiFi permissions on Android
 */
async function requestWifiPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions differently
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
      PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
    ]);

    return (
      granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.ACCESS_WIFI_STATE'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.CHANGE_WIFI_STATE'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.error('[WiFiProvisioning] Permission error:', err);
    return false;
  }
}

/**
 * Scan for available WiFi networks
 */
async function scanNetworks(): Promise<string[]> {
  try {
    const networks = await WifiManager.loadWifiList();
    return networks.map((network: any) => network.SSID);
  } catch (error) {
    console.error('[WiFiProvisioning] Scan error:', error);
    return [];
  }
}

/**
 * Check if device AP is available
 */
async function isDeviceAPAvailable(): Promise<boolean> {
  try {
    const networks = await scanNetworks();
    return networks.some(ssid => ssid.startsWith(DEVICE_AP_PREFIX));
  } catch (error) {
    console.error('[WiFiProvisioning] AP check error:', error);
    return false;
  }
}

/**
 * Connect to device AP
 */
async function connectToDeviceAP(): Promise<boolean> {
  try {
    console.log('[WiFiProvisioning] Connecting to device AP...');
    
    // For Android
    if (Platform.OS === 'android') {
      await WifiManager.connectToProtectedSSID(
        DEVICE_AP_PREFIX,
        '',
        false, // isWEP
        false  // isHidden
      );
    } else {
      // iOS - requires manual connection prompt
      Alert.alert(
        'Connect to Device',
        `Please connect to "${DEVICE_AP_PREFIX}" WiFi network in your device settings, then return to this app.`,
        [{ text: 'OK' }]
      );
    }

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify connection
    const currentSSID = await WifiManager.getCurrentWifiSSID();
    const isConnected = currentSSID.startsWith(DEVICE_AP_PREFIX);
    
    console.log('[WiFiProvisioning] Current SSID:', currentSSID);
    console.log('[WiFiProvisioning] Connected:', isConnected);
    
    return isConnected;
  } catch (error) {
    console.error('[WiFiProvisioning] Connection error:', error);
    return false;
  }
}

/**
 * Send WiFi credentials to device
 */
async function sendCredentials(
  ssid: string,
  password: string,
  email?: string
): Promise<ProvisioningResult> {
  try {
    console.log('[WiFiProvisioning] Sending credentials to device...');

    const payload = {
      ssid,
      password,
      ...(email && { email }),
    };

    const response = await fetch(`http://${DEVICE_AP_IP}${PROVISIONING_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log('[WiFiProvisioning] Success! Device ID:', data.deviceId);
      return {
        success: true,
        deviceId: data.deviceId,
        message: data.message,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error('[WiFiProvisioning] Send credentials error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send credentials',
    };
  }
}

/**
 * Disconnect from device AP and reconnect to original WiFi
 */
async function restoreWiFiConnection(originalSSID: string): Promise<void> {
  try {
    console.log('[WiFiProvisioning] Restoring WiFi connection...');
    
    // Android can programmatically reconnect
    if (Platform.OS === 'android') {
      // Device will restart, so we just need to disconnect from AP
      await WifiManager.disconnect();
      
      // Wait a moment then reconnect to original network
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Note: Reconnecting to original network may require user interaction
      // depending on Android version and network security
    } else {
      // iOS - show prompt
      Alert.alert(
        'Setup Complete',
        'Please reconnect to your home WiFi network in device settings.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('[WiFiProvisioning] Restore connection error:', error);
  }
}

/**
 * Main provisioning function
 * 
 * @param deviceName - Name for the device (for user display)
 * @param wifiSSID - WiFi network SSID to configure
 * @param wifiPassword - WiFi network password
 * @param email - Optional email for alerts
 * @returns ProvisioningResult with success status and device ID
 */
export async function provisionAirguard(
  deviceName: string,
  wifiSSID: string,
  wifiPassword: string,
  email?: string
): Promise<ProvisioningResult> {
  try {
    console.log('[WiFiProvisioning] Starting provisioning for:', deviceName);

    // Step 1: Request permissions
    const hasPermissions = await requestWifiPermissions();
    if (!hasPermissions) {
      return {
        success: false,
        error: 'WiFi permissions denied. Please enable location and WiFi permissions in settings.',
      };
    }

    // Step 2: Save current WiFi for restoration
    const originalSSID = await WifiManager.getCurrentWifiSSID();
    console.log('[WiFiProvisioning] Original SSID:', originalSSID);

    // Step 3: Check if device AP is available
    const apAvailable = await isDeviceAPAvailable();
    if (!apAvailable) {
      return {
        success: false,
        error: `Device access point "${DEVICE_AP_PREFIX}" not found. Please ensure the device is powered on and in setup mode.`,
      };
    }

    // Step 4: Connect to device AP
    const connected = await connectToDeviceAP();
    if (!connected) {
      return {
        success: false,
        error: 'Failed to connect to device. Please try again.',
      };
    }

    // Step 5: Send credentials
    const result = await sendCredentials(wifiSSID, wifiPassword, email);

    // Step 6: Restore original WiFi connection
    await restoreWiFiConnection(originalSSID);

    return result;
  } catch (error: any) {
    console.error('[WiFiProvisioning] Provisioning error:', error);
    return {
      success: false,
      error: error.message || 'Provisioning failed',
    };
  }
}

/**
 * Simplified flow for user interface
 * Shows loading states and error messages automatically
 */
export async function provisionAirguardWithUI(
  deviceName: string,
  wifiSSID: string,
  wifiPassword: string,
  email?: string,
  onProgress?: (step: string) => void
): Promise<ProvisioningResult> {
  const steps = [
    'Requesting permissions...',
    'Scanning for device...',
    'Connecting to device...',
    'Configuring WiFi...',
    'Finalizing setup...',
  ];

  let currentStep = 0;
  const updateProgress = () => {
    if (onProgress && currentStep < steps.length) {
      onProgress(steps[currentStep]);
      currentStep++;
    }
  };

  updateProgress(); // Step 1
  const hasPermissions = await requestWifiPermissions();
  if (!hasPermissions) {
    return {
      success: false,
      error: 'WiFi permissions denied',
    };
  }

  updateProgress(); // Step 2
  const originalSSID = await WifiManager.getCurrentWifiSSID();
  const apAvailable = await isDeviceAPAvailable();
  if (!apAvailable) {
    return {
      success: false,
      error: 'Device not found. Ensure it is powered on.',
    };
  }

  updateProgress(); // Step 3
  const connected = await connectToDeviceAP();
  if (!connected) {
    return {
      success: false,
      error: 'Could not connect to device',
    };
  }

  updateProgress(); // Step 4
  const result = await sendCredentials(wifiSSID, wifiPassword, email);

  updateProgress(); // Step 5
  await restoreWiFiConnection(originalSSID);

  return result;
}

export default {
  provisionAirguard,
  provisionAirguardWithUI,
  requestWifiPermissions,
  scanNetworks,
  isDeviceAPAvailable,
};
