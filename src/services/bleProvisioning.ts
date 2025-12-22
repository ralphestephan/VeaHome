/**
 * BLE WiFi Provisioning Service
 * 
 * Seamless device setup via Bluetooth - like Tuya!
 * 
 * Flow:
 * 1. App scans for BLE devices named "SmartMonitor_X"
 * 2. App connects via BLE (phone stays on home WiFi!)
 * 3. App sends WiFi credentials over BLE
 * 4. Device connects to WiFi, BLE turns off
 * 5. Done! Phone never lost internet
 * 
 * BLE Protocol:
 * - Service UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 * - Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
 * - Write: {"ssid":"...","password":"..."}
 * - Notify: {"success":true,"deviceId":1}
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

// BLE UUIDs (must match firmware)
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Device name prefix
const DEVICE_NAME_PREFIX = 'SmartMonitor';

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  deviceId?: number; // Parsed from name like "SmartMonitor_1"
}

export interface ProvisionResult {
  success: boolean;
  deviceId?: number;
  error?: string;
}

// Singleton BLE manager
let bleManager: BleManager | null = null;

function getBleManager(): BleManager {
  if (!bleManager) {
    bleManager = new BleManager();
  }
  return bleManager;
}

/**
 * Request Bluetooth permissions (Android)
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions automatically
  }

  try {
    // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android 11 and below
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Permission',
          message: 'VeaHome needs Bluetooth to find and setup your devices',
          buttonPositive: 'Allow',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('[BLE] Permission error:', err);
    return false;
  }
}

/**
 * Check if Bluetooth is enabled
 */
export async function checkBluetoothEnabled(): Promise<boolean> {
  const manager = getBleManager();
  
  return new Promise((resolve) => {
    manager.state().then(state => {
      resolve(state === 'PoweredOn');
    });
  });
}

/**
 * Scan for SmartMonitor devices
 */
export async function scanForDevices(
  onDeviceFound: (device: BLEDevice) => void,
  timeoutMs: number = 10000
): Promise<BLEDevice[]> {
  console.log('[BLE] Starting scan...');
  
  const hasPermission = await requestPermissions();
  if (!hasPermission) {
    throw new Error('Bluetooth permission denied');
  }

  const manager = getBleManager();
  const devices: Map<string, BLEDevice> = new Map();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      manager.stopDeviceScan();
      console.log('[BLE] Scan complete, found:', devices.size);
      resolve(Array.from(devices.values()));
    }, timeoutMs);

    manager.startDeviceScan(
      [SERVICE_UUID], // Only scan for devices with our service
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('[BLE] Scan error:', error);
          clearTimeout(timeout);
          manager.stopDeviceScan();
          reject(error);
          return;
        }

        if (device && device.name?.startsWith(DEVICE_NAME_PREFIX)) {
          // Parse device ID from name (e.g., "SmartMonitor_1" -> 1)
          const match = device.name.match(/SmartMonitor_(\d+)/);
          const deviceId = match ? parseInt(match[1], 10) : undefined;

          const bleDevice: BLEDevice = {
            id: device.id,
            name: device.name,
            rssi: device.rssi || -100,
            deviceId,
          };

          if (!devices.has(device.id)) {
            devices.set(device.id, bleDevice);
            console.log('[BLE] Found device:', bleDevice.name, 'RSSI:', bleDevice.rssi);
            onDeviceFound(bleDevice);
          }
        }
      }
    );
  });
}

/**
 * Stop scanning
 */
export function stopScan(): void {
  const manager = getBleManager();
  manager.stopDeviceScan();
  console.log('[BLE] Scan stopped');
}

/**
 * Provision a device with WiFi credentials via BLE
 */
export async function provisionDevice(
  bleDeviceId: string,
  wifiSSID: string,
  wifiPassword: string,
  onProgress?: (step: string) => void
): Promise<ProvisionResult> {
  const manager = getBleManager();
  let connectedDevice: Device | null = null;

  try {
    // Step 1: Connect to device
    onProgress?.('Connecting to device...');
    console.log('[BLE] Connecting to:', bleDeviceId);

    connectedDevice = await manager.connectToDevice(bleDeviceId, {
      timeout: 10000,
    });

    console.log('[BLE] Connected, discovering services...');
    onProgress?.('Discovering services...');

    // Step 2: Discover services and characteristics
    await connectedDevice.discoverAllServicesAndCharacteristics();

    // Step 3: Setup notification listener for response
    let responseReceived = false;
    let provisionResult: ProvisionResult = { success: false };

    const responsePromise = new Promise<ProvisionResult>((resolve) => {
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          resolve({ success: false, error: 'Response timeout' });
        }
      }, 15000);

      connectedDevice!.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] Notification error:', error);
            return;
          }

          if (characteristic?.value) {
            const response = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            console.log('[BLE] Received response:', response);

            try {
              const parsed = JSON.parse(response);
              responseReceived = true;
              clearTimeout(timeout);
              resolve({
                success: parsed.success === true,
                deviceId: parsed.deviceId,
                error: parsed.error || parsed.message,
              });
            } catch (e) {
              console.error('[BLE] Failed to parse response:', e);
            }
          }
        }
      );
    });

    // Step 4: Send WiFi credentials
    onProgress?.('Sending WiFi credentials...');
    console.log('[BLE] Sending credentials for SSID:', wifiSSID);

    const payload = JSON.stringify({
      ssid: wifiSSID,
      password: wifiPassword,
    });

    const base64Payload = Buffer.from(payload).toString('base64');

    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      base64Payload
    );

    console.log('[BLE] Credentials sent, waiting for response...');
    onProgress?.('Waiting for device to connect to WiFi...');

    // Step 5: Wait for response
    provisionResult = await responsePromise;

    // Step 6: Disconnect
    onProgress?.('Finishing up...');
    try {
      await connectedDevice.cancelConnection();
    } catch (e) {
      // Device may have already disconnected
    }

    if (provisionResult.success) {
      console.log('[BLE] Provisioning successful! Device ID:', provisionResult.deviceId);
      onProgress?.('Device configured successfully!');
    } else {
      console.error('[BLE] Provisioning failed:', provisionResult.error);
    }

    return provisionResult;

  } catch (error: any) {
    console.error('[BLE] Provisioning error:', error);

    // Try to disconnect if still connected
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    return {
      success: false,
      error: error.message || 'BLE connection failed',
    };
  }
}

/**
 * Clean up BLE resources
 */
export function destroyBLE(): void {
  if (bleManager) {
    bleManager.destroy();
    bleManager = null;
  }
}
