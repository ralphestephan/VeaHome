/**
 * SEAMLESS Device WiFi Provisioning
 * 
 * ZERO MANUAL STEPS - Fully automatic WiFi configuration
 * User just enters their home WiFi credentials, app handles everything
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';

const DEVICE_AP_SSID = 'SmartMonitor_Setup';
const DEVICE_IP = '192.168.4.1';

interface ProvisionResult {
  success: boolean;
  deviceId?: number;
  error?: string;
}

// Dynamically load WiFi library
let WifiManager: any = null;
try {
  WifiManager = require('react-native-wifi-reborn').default;
} catch (e) {
  console.log('[Provisioning] WiFi library not available');
}

/**
 * Request necessary Android permissions
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
      PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE,
    ]);

    return Object.values(granted).every(result => 
      result === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.error('[Provisioning] Permission error:', err);
    return false;
  }
}

/**
 * Automatically provision device with WiFi credentials
 * NO USER INTERACTION REQUIRED
 */
export async function provisionDevice(
  homeWifiSSID: string,
  homeWifiPassword: string,
  userEmail?: string,
  onProgress?: (step: string) => void
): Promise<ProvisionResult> {
  
  // Platform check
  if (Platform.OS !== 'android') {
    return {
      success: false,
      error: 'Automatic WiFi provisioning is only available on Android'
    };
  }

  if (!WifiManager) {
    return {
      success: false,
      error: 'WiFi library not available'
    };
  }

  try {
    // Step 1: Get permissions
    onProgress?.('Requesting permissions...');
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return {
        success: false,
        error: 'Location and WiFi permissions are required'
      };
    }

    // Step 2: Auto-connect to device AP
    onProgress?.('Connecting to device...');
    console.log('[Provisioning] Connecting to', DEVICE_AP_SSID);
    
    await WifiManager.connectToProtectedSSID(
      DEVICE_AP_SSID,
      '',  // No password
      false,
      false
    );
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Step 3: Send credentials
    onProgress?.('Configuring WiFi...');
    console.log('[Provisioning] Sending credentials');
    
    const response = await fetch(`http://${DEVICE_IP}/api/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid: homeWifiSSID,
        password: homeWifiPassword,
        email: userEmail || ''
      })
    });

    const result = await response.json();

    if (result.success && result.deviceId) {
      // Step 4: Reconnect to home WiFi
      onProgress?.('Reconnecting...');
      try {
        await WifiManager.connectToProtectedSSID(
          homeWifiSSID,
          homeWifiPassword,
          false,
          false
        );
      } catch (e) {
        console.warn('[Provisioning] Could not auto-reconnect');
      }
      
      return {
        success: true,
        deviceId: result.deviceId
      };
    }

    return {
      success: false,
      error: result.message || 'Device configuration failed'
    };

  } catch (error: any) {
    console.error('[Provisioning] Error:', error);
    return {
      success: false,
      error: error.message || 'Connection failed. Make sure device is powered on.'
    };
  }
}
