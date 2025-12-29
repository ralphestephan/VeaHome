/**
 * BLE Reprovisioning Utility
 * Allows re-sending WiFi credentials to devices via Bluetooth Low Energy
 */

import { BleManager, Device as BLEDevice } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Alert } from 'react-native';

// BLE Service UUIDs - must match ESP32 firmware
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const WIFI_CRED_CHAR_UUID = 'cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f';

// Initialize BLE Manager (lazy - only on native platforms)
let bleManager: BleManager | null = null;
const getBleManager = () => {
  if (bleManager === null && Platform.OS !== 'web') {
    bleManager = new BleManager();
  }
  return bleManager;
};

export interface ReprovisionOptions {
  ssid: string;
  password: string;
  deviceName?: string; // Optional device name to search for
  timeout?: number; // Scan timeout in milliseconds (default: 10000)
}

export interface ReprovisionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Request necessary permissions for BLE reprovisioning
 */
export async function requestBLEPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    try {
      // Request location permission (required for BLE scanning on Android)
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Location permission is required for Bluetooth scanning',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Required', 'Location permission is required for Bluetooth scanning');
        return false;
      }

      // Request Bluetooth permissions (Android 12+)
      if (Platform.Version >= 31) {
        const bluetoothScan = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan Permission',
            message: 'Bluetooth scan permission is required',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const bluetoothConnect = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect Permission',
            message: 'Bluetooth connect permission is required',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (bluetoothScan !== PermissionsAndroid.RESULTS.GRANTED ||
            bluetoothConnect !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Bluetooth permissions are required');
          return false;
        }
      }
    } catch (error) {
      console.error('[BLE Reprovision] Permission error:', error);
      return false;
    }
  }

  return true;
}

/**
 * Scan for BLE devices and find the target device
 */
async function scanForDevice(
  deviceName?: string,
  timeout: number = 10000
): Promise<BLEDevice | null> {
  const manager = getBleManager();
  if (!manager) {
    throw new Error('BLE not supported on this platform');
  }

  return new Promise((resolve, reject) => {
    const discoveredDevices: BLEDevice[] = [];
    let scanTimeout: NodeJS.Timeout;

    const subscription = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        manager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            console.error('[BLE Reprovision] Scan error:', error);
            manager.stopDeviceScan();
            clearTimeout(scanTimeout);
            subscription.remove();
            reject(error);
            return;
          }

          if (device) {
            console.log('[BLE Reprovision] Found device:', device.name, device.id);
            
            // If deviceName is provided, match by name; otherwise accept any device with the service
            if (deviceName) {
              if (device.name && device.name.toLowerCase().includes(deviceName.toLowerCase())) {
                discoveredDevices.push(device);
              }
            } else {
              // Accept any device (user will need to select)
              discoveredDevices.push(device);
            }
          }
        });

        // Timeout after specified duration
        scanTimeout = setTimeout(() => {
          manager.stopDeviceScan();
          subscription.remove();
          
          if (discoveredDevices.length === 0) {
            resolve(null);
          } else {
            // Return first matching device
            resolve(discoveredDevices[0]);
          }
        }, timeout);
      }
    }, true);
  });
}

/**
 * Connect to a BLE device and send WiFi credentials
 */
async function connectAndProvision(
  device: BLEDevice,
  ssid: string,
  password: string
): Promise<void> {
  console.log('[BLE Reprovision] Connecting to device:', device.id);
  
  // Connect to device
  const connectedDevice = await device.connect();
  console.log('[BLE Reprovision] Connected to device');

  try {
    // Discover services and characteristics
    await connectedDevice.discoverAllServicesAndCharacteristics();
    console.log('[BLE Reprovision] Services discovered');

    // Prepare credentials
    const credentials = {
      ssid,
      password,
    };

    const jsonString = JSON.stringify(credentials);
    const base64Data = btoa(jsonString);
    console.log('[BLE Reprovision] Sending credentials for SSID:', ssid);

    // Request larger MTU if possible
    try {
      await connectedDevice.requestMTU(512);
      console.log('[BLE Reprovision] MTU negotiated');
    } catch (mtuError) {
      console.warn('[BLE Reprovision] MTU request failed (continuing anyway):', mtuError);
    }

    // Write credentials to characteristic
    await connectedDevice.writeCharacteristicWithoutResponseForService(
      SERVICE_UUID,
      WIFI_CRED_CHAR_UUID,
      base64Data
    );

    console.log('[BLE Reprovision] Credentials sent successfully');

    // Wait a bit for device to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Disconnect
    await connectedDevice.cancelConnection();
    console.log('[BLE Reprovision] Disconnected from device');
  } catch (error) {
    // Try to disconnect even if there was an error
    try {
      await connectedDevice.cancelConnection();
    } catch (disconnectError) {
      console.error('[BLE Reprovision] Error disconnecting:', disconnectError);
    }
    throw error;
  }
}

/**
 * Main reprovision function
 * Scans for device, connects, and sends WiFi credentials
 */
export async function reprovisionDevice(
  options: ReprovisionOptions
): Promise<ReprovisionResult> {
  try {
    console.log('[BLE Reprovision] Starting reprovision with options:', {
      ssid: options.ssid,
      deviceName: options.deviceName,
    });

    // Check permissions
    const hasPermissions = await requestBLEPermissions();
    if (!hasPermissions) {
      return {
        success: false,
        message: 'Permissions denied',
        error: 'Required Bluetooth and location permissions were not granted',
      };
    }

    // Validate inputs
    if (!options.ssid || options.ssid.trim().length === 0) {
      return {
        success: false,
        message: 'Invalid SSID',
        error: 'WiFi SSID cannot be empty',
      };
    }

    // Scan for device
    console.log('[BLE Reprovision] Scanning for device...');
    const device = await scanForDevice(options.deviceName, options.timeout || 10000);

    if (!device) {
      return {
        success: false,
        message: 'Device not found',
        error: options.deviceName
          ? `Could not find device matching "${options.deviceName}"`
          : 'No BLE devices found. Make sure the device is in pairing mode.',
      };
    }

    console.log('[BLE Reprovision] Device found:', device.name);

    // Connect and provision
    await connectAndProvision(device, options.ssid, options.password);

    return {
      success: true,
      message: 'WiFi credentials sent successfully. Device will reconnect to WiFi.',
    };
  } catch (error: any) {
    console.error('[BLE Reprovision] Error:', error);
    return {
      success: false,
      message: 'Reprovisioning failed',
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Cleanup BLE manager (call when done)
 */
export function cleanupBLE() {
  if (bleManager) {
    bleManager.stopDeviceScan();
    bleManager.destroy();
    bleManager = null;
  }
}

