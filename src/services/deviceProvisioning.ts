/**
 * SEAMLESS Device WiFi Provisioning (Tuya-style)
 * 
 * Requires: Expo Development Build (not Expo Go)
 * - App automatically connects to device AP
 * - Sends credentials via HTTP
 * - Automatically reconnects to home WiFi
 * - User never leaves the app!
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

const DEVICE_AP_SSID = 'SmartMonitor_Setup';
const DEVICE_IP = '192.168.4.1';

interface ProvisionResult {
  success: boolean;
  deviceId?: number;
  error?: string;
}

/**
 * Request Android location permission (required for WiFi scanning/connecting)
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message: 'VeaHome needs location access to connect to your smart device',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('[Provision] Permission error:', err);
    return false;
  }
}

/**
 * Wait for WiFi connection to be established
 */
async function waitForConnection(targetSSID: string, timeoutMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const currentSSID = await WifiManager.getCurrentWifiSSID();
      const cleanSSID = currentSSID?.replace(/"/g, '') || '';
      
      if (cleanSSID === targetSSID || cleanSSID.includes('SmartMonitor')) {
        console.log('[Provision] Connected to:', cleanSSID);
        return true;
      }
    } catch (e) {
      // Ignore errors during polling
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * SEAMLESS Provisioning - Like Tuya!
 * User just enters home WiFi credentials, everything else is automatic
 */
export async function provisionDevice(
  homeWifiSSID: string,
  homeWifiPassword: string,
  userEmail?: string,
  onProgress?: (step: string) => void
): Promise<ProvisionResult> {
  
  console.log('[Provision] Starting seamless provisioning...');
  
  try {
    // Step 1: Request permissions
    onProgress?.('Requesting permissions...');
    const hasPermission = await requestPermissions();
    
    if (!hasPermission) {
      return {
        success: false,
        error: 'Location permission is required to connect to the device'
      };
    }

    // Step 2: Auto-connect to device AP
    onProgress?.('Connecting to device...');
    console.log('[Provision] Connecting to', DEVICE_AP_SSID);
    
    try {
      // Disconnect from current network first
      await WifiManager.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Connect to device AP (open network, no password)
      if (Platform.OS === 'ios') {
        await WifiManager.connectToSSID(DEVICE_AP_SSID);
      } else {
        await WifiManager.connectToProtectedSSID(DEVICE_AP_SSID, '', false, false);
      }
    } catch (connectError: any) {
      console.log('[Provision] Initial connect attempt:', connectError.message);
      // Try alternative method
      try {
        await WifiManager.connectToSSID(DEVICE_AP_SSID);
      } catch (e) {
        // Continue anyway, we'll check if connected
      }
    }

    // Wait for connection
    onProgress?.('Waiting for device connection...');
    const connected = await waitForConnection(DEVICE_AP_SSID, 15000);
    
    if (!connected) {
      // Check if maybe we're already connected
      try {
        const response = await fetch(`http://${DEVICE_IP}/`, { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (!response.ok) throw new Error('Not reachable');
      } catch {
        return {
          success: false,
          error: `Could not connect to device WiFi "${DEVICE_AP_SSID}". Make sure the device is in setup mode (showing "SETUP MODE" on display).`
        };
      }
    }

    // Small delay to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Send credentials to device
    onProgress?.('Sending WiFi credentials...');
    console.log('[Provision] Sending credentials for:', homeWifiSSID);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let response;
    try {
      response = await fetch(`http://${DEVICE_IP}/api/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssid: homeWifiSSID,
          password: homeWifiPassword,
          email: userEmail || ''
        }),
        signal: controller.signal
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('[Provision] Fetch error:', fetchError);
      return {
        success: false,
        error: 'Could not reach device. Make sure you are connected to "SmartMonitor_Setup" WiFi.'
      };
    }
    
    clearTimeout(timeoutId);
    
    const result = await response.json();
    console.log('[Provision] Device response:', result);

    if (!result.success) {
      return {
        success: false,
        error: result.message || 'Device rejected the credentials'
      };
    }

    // Step 4: Reconnect to home WiFi
    onProgress?.('Reconnecting to home WiFi...');
    console.log('[Provision] Reconnecting to:', homeWifiSSID);
    
    // Wait a moment for device to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Disconnect from device AP
      await WifiManager.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect to home WiFi
      if (Platform.OS === 'ios') {
        await WifiManager.connectToProtectedSSID(homeWifiSSID, homeWifiPassword, false, false);
      } else {
        await WifiManager.connectToProtectedSSID(homeWifiSSID, homeWifiPassword, false, false);
      }
      
      // Wait for home WiFi connection
      await waitForConnection(homeWifiSSID, 15000);
      console.log('[Provision] Reconnected to home WiFi');
    } catch (reconnectError) {
      console.warn('[Provision] Auto-reconnect failed, user may need to reconnect manually');
      // Don't fail - provisioning was successful
    }

    onProgress?.('Device configured successfully!');
    
    return {
      success: true,
      deviceId: result.deviceId || 1
    };

  } catch (error: any) {
    console.error('[Provision] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Check if currently connected to the device AP
 */
export async function isConnectedToDevice(): Promise<boolean> {
  try {
    const ssid = await WifiManager.getCurrentWifiSSID();
    const cleanSSID = ssid?.replace(/"/g, '') || '';
    return cleanSSID === DEVICE_AP_SSID || cleanSSID.includes('SmartMonitor');
  } catch {
    return false;
  }
}

/**
 * Get current WiFi SSID
 */
export async function getCurrentSSID(): Promise<string | null> {
  try {
    const ssid = await WifiManager.getCurrentWifiSSID();
    return ssid?.replace(/"/g, '') || null;
  } catch {
    return null;
  }
}
