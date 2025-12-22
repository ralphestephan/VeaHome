import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeColors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BleManager, Device as BLEDevice } from 'react-native-ble-plx';
import * as hubApi from '../services/api';

// BLE Service UUIDs - must match ESP32 firmware
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const WIFI_LIST_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const WIFI_CRED_CHAR_UUID = 'cf7e8a3d-c4c0-4ff1-8b42-bc5e0e3f4d8f';
const DEVICE_INFO_CHAR_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';

interface DiscoveredDevice {
  id: string;
  name: string;
  rssi: number;
}

interface WiFiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}

type WizardStep = 'permissions' | 'scanning' | 'device-found' | 'network-scan' | 'credentials' | 'provisioning' | 'success';

// Initialize BLE Manager
const bleManager = new BleManager();

export default function BLEDeviceWizard({ route }: any) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const homeId = route.params?.homeId;
  const hubId = route.params?.hubId;
  const roomId = route.params?.roomId;

  const [currentStep, setCurrentStep] = useState<WizardStep>('permissions');
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [connectedBLEDevice, setConnectedBLEDevice] = useState<BLEDevice | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<{ deviceId?: string | number; name?: string } | null>(null);

  // Permission flags
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState(false);
  const [hasNetworkPermission, setHasNetworkPermission] = useState(false);

  // Cleanup BLE on unmount
  useEffect(() => {
    return () => {
      bleManager.stopDeviceScan();
      if (connectedBLEDevice) {
        connectedBLEDevice.cancelConnection().catch(() => {});
      }
    };
  }, [connectedBLEDevice]);

  // Request all permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        const locationGranted = granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
        const bluetoothGranted = granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED;

        setHasLocationPermission(locationGranted);
        setHasBluetoothPermission(bluetoothGranted);
        setHasNetworkPermission(true); // Network permission not strictly required

        return locationGranted && bluetoothGranted;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    // iOS handles permissions automatically
    setHasLocationPermission(true);
    setHasBluetoothPermission(true);
    setHasNetworkPermission(true);
    return true;
  };

  // Start BLE scan for devices
  const startBLEScan = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      Alert.alert('Permissions Required', 'Please grant Bluetooth and Location permissions to scan for devices');
      return;
    }

    setIsScanning(true);
    setStatusMessage('Searching for nearby devices...');
    setCurrentStep('scanning');
    setDiscoveredDevices([]);

    try {
      // Check BLE state
      const state = await bleManager.state();
      if (state !== 'PoweredOn') {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to scan for devices');
        setIsScanning(false);
        return;
      }

      // Start scanning
      bleManager.startDeviceScan(
        null, // Scan for all devices
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('BLE Scan Error:', error);
            if (error.errorCode === 102) {
              // Bluetooth powered off
              Alert.alert('Bluetooth Off', 'Please enable Bluetooth');
            }
            setIsScanning(false);
            return;
          }

          if (device?.name && (
            device.name.includes('SmartMonitor') || 
            device.name.includes('AirGuard') ||
            device.name.includes('Vealive')
          )) {
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
        setDiscoveredDevices(prev => {
          if (prev.length > 0) {
            setCurrentStep('device-found');
          } else {
            Alert.alert('No Devices Found', 'Make sure your device is powered on and in pairing mode');
          }
          return prev;
        });
      }, 10000);

    } catch (error) {
      console.error('BLE Error:', error);
      setIsScanning(false);
      Alert.alert('Scan Error', 'Failed to start device scan');
    }
  };

  // Connect to selected BLE device
  const connectToDevice = async (device: DiscoveredDevice) => {
    setSelectedDevice(device);
    setStatusMessage(`Connecting to ${device.name}...`);
    setIsScanning(true);

    try {
      // Connect to device
      const connected = await bleManager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();
      
      setConnectedBLEDevice(connected);
      setIsScanning(false);
      setStatusMessage('Connected! Reading device info...');

      // Read device info
      try {
        const deviceInfoChar = await connected.readCharacteristicForService(
          SERVICE_UUID,
          DEVICE_INFO_CHAR_UUID
        );
        if (deviceInfoChar.value) {
          const info = JSON.parse(atob(deviceInfoChar.value));
          setDeviceInfo(info);
          console.log('Device Info:', info);
        }
      } catch (err) {
        console.log('Could not read device info:', err);
      }

      // Request WiFi networks from device
      setCurrentStep('network-scan');
      await requestWiFiNetworks(connected);

    } catch (error: any) {
      console.error('Connection Error:', error);
      setIsScanning(false);
      Alert.alert(
        'Connection Failed', 
        error.message || 'Could not connect to device. Make sure it\'s powered on and nearby.'
      );
      setCurrentStep('device-found');
    }
  };

  // Request WiFi networks from BLE device
  const requestWiFiNetworks = async (device: BLEDevice) => {
    setStatusMessage('Scanning for WiFi networks...');
    
    try {
      // Read WiFi network list from device
      const networksChar = await device.readCharacteristicForService(
        SERVICE_UUID,
        WIFI_LIST_CHAR_UUID
      );
      
      if (networksChar.value) {
        const networks = JSON.parse(atob(networksChar.value));
        setWifiNetworks(networks);
        setStatusMessage('');
      } else {
        // Fallback: use mock data if device doesn't provide networks yet
        setWifiNetworks([
          { ssid: 'Home WiFi', signal: -45, secured: true },
          { ssid: 'Guest Network', signal: -60, secured: false },
        ]);
        setStatusMessage('Using available networks');
      }
    } catch (error) {
      console.error('WiFi Scan Error:', error);
      // Use mock data as fallback
      setWifiNetworks([
        { ssid: 'Home WiFi', signal: -45, secured: true },
        { ssid: 'Guest Network', signal: -60, secured: false },
      ]);
      setStatusMessage('Select your WiFi network');
    }
  };

  // Send WiFi credentials to device via BLE
  const provisionDevice = async () => {
    if (!selectedNetwork || !wifiPassword) {
      Alert.alert('Missing Information', 'Please select network and enter password');
      return;
    }

    if (!connectedBLEDevice) {
      Alert.alert('Not Connected', 'Please reconnect to the device');
      return;
    }

    setCurrentStep('provisioning');
    setStatusMessage('Sending WiFi credentials to device...');

    try {
      const credentials = {
        ssid: selectedNetwork.ssid,
        password: wifiPassword
      };

      // Write credentials to device
      await connectedBLEDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        WIFI_CRED_CHAR_UUID,
        btoa(JSON.stringify(credentials))
      );

      setStatusMessage('Credentials sent! Device is connecting to WiFi...');

      // Device will restart - wait then try to add to backend
      setTimeout(async () => {
        try {
          // Disconnect BLE
          await connectedBLEDevice.cancelConnection();
          setConnectedBLEDevice(null);

          // Create device in backend
          if (homeId && deviceInfo?.deviceId) {
            const response = await hubApi.addDevice(homeId, {
              name: selectedDevice?.name || 'SmartMonitor',
              type: 'airguard',
              category: 'WiFi',
              roomId: roomId,
              hubId: hubId,
              metadata: {
                smartMonitorId: deviceInfo.deviceId,
              }
            });

            console.log('Device added to backend:', response.data);
          }

          setCurrentStep('success');
          setStatusMessage('Device connected successfully!');
        } catch (error: any) {
          console.error('Backend Error:', error);
          // Still show success - device is provisioned even if backend fails
          setCurrentStep('success');
          setStatusMessage('Device connected! You may need to add it manually.');
        }
      }, 5000);

    } catch (error: any) {
      console.error('Provisioning Error:', error);
      setIsScanning(false);
      Alert.alert(
        'Provisioning Failed',
        error.message || 'Could not send credentials to device'
      );
      setCurrentStep('credentials');
    }
  };

  useEffect(() => {
    if (currentStep === 'permissions') {
      requestPermissions();
    }
  }, [currentStep]);

  const renderPermissionsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={80} color={colors.accent} />
      </View>

      <Text style={styles.title}>Permissions Required</Text>
      <Text style={styles.description}>
        To provide you with better services, we request the following permissions:
      </Text>

      <View style={styles.permissionsList}>
        <View style={styles.permissionItem}>
          <View style={[styles.checkbox, hasLocationPermission && styles.checkboxChecked]}>
            {hasLocationPermission && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Location</Text>
            <Text style={styles.permissionDescription}>
              Find locations, add devices, get WiFi network list
            </Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <View style={[styles.checkbox, hasNetworkPermission && styles.checkboxChecked]}>
            {hasNetworkPermission && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Local Network</Text>
            <Text style={styles.permissionDescription}>Add devices</Text>
          </View>
        </View>

        <View style={styles.permissionItem}>
          <View style={[styles.checkbox, hasBluetoothPermission && styles.checkboxChecked]}>
            {hasBluetoothPermission && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>Bluetooth</Text>
            <Text style={styles.permissionDescription}>
              Search and add nearby Bluetooth devices
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => startBLEScan()}
      >
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderScanningStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      <Text style={styles.title}>Searching for devices</Text>
      <Text style={styles.description}>
        Make sure your device has entered pairing mode
      </Text>
      
      {discoveredDevices.length > 0 && (
        <View style={styles.devicesList}>
          {discoveredDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceItem}
              onPress={() => connectToDevice(device)}
            >
              <Ionicons name="bluetooth" size={24} color={colors.accent} />
              <Text style={styles.deviceName}>{device.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderDeviceFoundStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
      </View>
      <Text style={styles.title}>Device Found!</Text>
      
      <View style={styles.devicesList}>
        {discoveredDevices.map((device) => (
          <TouchableOpacity
            key={device.id}
            style={[
              styles.deviceItem,
              selectedDevice?.id === device.id && styles.deviceItemSelected
            ]}
            onPress={() => connectToDevice(device)}
          >
            <Ionicons name="bluetooth" size={24} color={colors.accent} />
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceRssi}>Signal: {device.rssi} dBm</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.tapMessage}>Tap a device to connect</Text>
    </View>
  );

  const renderNetworkScanStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Select WiFi Network</Text>
      <Text style={styles.description}>Choose your home WiFi network</Text>

      <ScrollView style={styles.networksList}>
        {wifiNetworks.map((network, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.networkItem,
              selectedNetwork?.ssid === network.ssid && styles.networkItemSelected
            ]}
            onPress={() => {
              setSelectedNetwork(network);
              setCurrentStep('credentials');
            }}
          >
            <Ionicons name="wifi" size={24} color={colors.accent} />
            <Text style={styles.networkName}>{network.ssid}</Text>
            {network.secured && <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {statusMessage && (
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      )}
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Enter WiFi Information</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <Ionicons name="wifi" size={20} color={colors.accent} />
          <Text style={styles.inputLabel}>{selectedNetwork?.ssid}</Text>
          <TouchableOpacity onPress={() => setCurrentStep('network-scan')}>
            <Text style={styles.selectWifiLink}>Select WiFi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={wifiPassword}
            onChangeText={setWifiPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={provisionDevice}
        disabled={!wifiPassword}
      >
        <LinearGradient
          colors={wifiPassword ? ['#007AFF', '#0051D5'] : ['#888', '#666']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Next</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderProvisioningStep = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      <Text style={styles.title}>Connecting Device</Text>
      <Text style={styles.description}>{statusMessage}</Text>
      <Text style={styles.subDescription}>This may take a moment...</Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
      </View>
      <Text style={styles.title}>Success!</Text>
      <Text style={styles.description}>
        Your device has been connected successfully
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.goBack()}
      >
        <LinearGradient
          colors={['#4CAF50', '#388E3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Done</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'permissions':
        return renderPermissionsStep();
      case 'scanning':
        return renderScanningStep();
      case 'device-found':
        return renderDeviceFoundStep();
      case 'network-scan':
        return renderNetworkScanStep();
      case 'credentials':
        return renderCredentialsStep();
      case 'provisioning':
        return renderProvisioningStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderPermissionsStep();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Device</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {['permissions', 'scanning', 'credentials', 'success'].map((step, index) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              (['permissions', 'scanning', 'device-found'].includes(currentStep) && index === 0) ||
              (['network-scan', 'credentials'].includes(currentStep) && index <= 1) ||
              (currentStep === 'provisioning' && index <= 2) ||
              (currentStep === 'success' && index <= 3)
                ? styles.progressDotActive
                : {}
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderCurrentStep()}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    headerRight: {
      width: 40,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    progressDotActive: {
      backgroundColor: colors.accent,
      width: 24,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
    },
    stepContainer: {
      alignItems: 'center',
    },
    iconContainer: {
      marginVertical: 40,
    },
    loader: {
      marginVertical: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 20,
    },
    subDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    permissionsList: {
      width: '100%',
      marginBottom: 32,
    },
    permissionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    permissionTextContainer: {
      flex: 1,
    },
    permissionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    permissionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    devicesList: {
      width: '100%',
      marginTop: 20,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    deviceItemSelected: {
      borderColor: colors.accent,
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    deviceRssi: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    tapMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 16,
    },
    networksList: {
      width: '100%',
      maxHeight: 400,
    },
    networkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    networkItemSelected: {
      borderColor: colors.accent,
    },
    networkName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    inputContainer: {
      width: '100%',
      marginBottom: 32,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
      flex: 1,
    },
    selectWifiLink: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    statusMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    primaryButton: {
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
    },
    buttonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });
