import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Lightbulb, 
  Thermometer, 
  Tv, 
  Fan, 
  Lock, 
  Camera, 
  Radio,
  Wind,
  ArrowRight,
  CheckCircle,
  Loader,
  Wifi,
  Bluetooth,
  RefreshCw,
  Signal,
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, HubApi, HomeApi } from '../services/api';
import { 
  scanForDevices, 
  provisionDevice as bleProvisionDevice,
  stopScan,
  checkBluetoothEnabled,
  isBLEAvailable,
  BLEDevice 
} from '../services/bleProvisioning';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params?: {
    hubId?: string;
    deviceType?: string; // 'SmartMonitor' for AirGuard direct flow
  };
};

type DeviceType = 'light' | 'ac' | 'tv' | 'blind' | 'lock' | 'camera' | 'sensor' | 'airguard';
type DeviceCategory = 'IR' | 'RF' | 'Relay' | 'Sensor' | 'Zigbee' | 'Matter' | 'WiFi';

const DEVICE_TYPES: { type: DeviceType; icon: any; name: string }[] = [
  { type: 'light', icon: Lightbulb, name: 'Light' },
  { type: 'ac', icon: Thermometer, name: 'AC' },
  { type: 'tv', icon: Tv, name: 'TV' },
  { type: 'blind', icon: Fan, name: 'Blinds' },
  { type: 'lock', icon: Lock, name: 'Lock' },
  { type: 'camera', icon: Camera, name: 'Camera' },
  { type: 'sensor', icon: Radio, name: 'Sensor' },
  { type: 'airguard', icon: Wind, name: 'Airguard' },
];

const DEVICE_ACTIONS: Record<string, string[]> = {
  ac: ['ON', 'OFF', 'TEMP_UP', 'TEMP_DOWN', 'MODE', 'FAN_SPEED'],
  tv: ['ON', 'OFF', 'CHANNEL_UP', 'CHANNEL_DOWN', 'VOLUME_UP', 'VOLUME_DOWN'],
  blind: ['UP', 'DOWN', 'STOP'],
};

type Step = 'type' | 'config' | 'learning' | 'wifi' | 'ready';
const STEP_ORDER: Step[] = ['type', 'config', 'learning', 'wifi', 'ready'];
const STEP_DESCRIPTIONS: Record<Step, string> = {
  type: 'Select what kind of device you are pairing so we can tailor the next steps.',
  config: 'Name the device, choose its category, and drop it into the right room.',
  learning: 'Teach the hub the commands your remote knows so actions stay in sync.',
  wifi: 'Pass along WiFi credentials so the device can live on your network.',
  ready: 'Review what was created and jump back to the dashboard or add another.',
};

export default function DeviceOnboardingWizard() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token, user } = useAuth();
  const demo = useDemo();
  const isDemoMode = token === 'DEMO_TOKEN';
  const { hubId, deviceType: routeDeviceType } = route.params || {};
  
  // Check if this is a direct AirGuard flow (from DevicesScreen)
  const isAirguardFlow = routeDeviceType === 'SmartMonitor' || routeDeviceType === 'airguard';
  
  const [step, setStep] = useState<Step>(isAirguardFlow ? 'wifi' : 'type');
  const [loading, setLoading] = useState(false);
  
  // Device configuration
  const [deviceType, setDeviceType] = useState<DeviceType | null>(isAirguardFlow ? 'airguard' : null);
  const [deviceName, setDeviceName] = useState(isAirguardFlow ? 'AirGuard' : '');
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>(isAirguardFlow ? 'Sensor' : 'IR');
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  // Airguard config
  const [airguardSmartMonitorId, setAirguardSmartMonitorId] = useState('1');
  
  // Signal learning
  const [deviceId, setDeviceId] = useState<string>('');
  const [learnedActions, setLearnedActions] = useState<Set<string>>(new Set());
  const [learningAction, setLearningAction] = useState<string | null>(null);
  
  // WiFi config
  const [deviceWifiSSID, setDeviceWifiSSID] = useState('');
  const [deviceWifiPassword, setDeviceWifiPassword] = useState('');
  const [provisioningStep, setProvisioningStep] = useState('');
  const [provisioningError, setProvisioningError] = useState('');
  
  // BLE scanning state
  const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
  const [selectedBleDevice, setSelectedBleDevice] = useState<BLEDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const safeAvailableRooms = Array.isArray(availableRooms) ? availableRooms : [];

  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);
  const homeApi = HomeApi(client);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    if (isDemoMode) {
      const demoRooms = demo.rooms || [];
      setAvailableRooms(demoRooms);
      if (demoRooms.length > 0) {
        setSelectedRoom(demoRooms[0].id);
      } else {
        setSelectedRoom('');
      }
      return;
    }

    if (!user?.homeId) return;
    try {
      const response = await homeApi.getRooms(user.homeId);
      const payload = (response.data as any)?.data ?? response.data;
      const list =
        Array.isArray(payload)
          ? payload
          : Array.isArray((payload as any)?.rooms)
            ? (payload as any).rooms
            : [];
      setAvailableRooms(list);
      if (list.length > 0) {
        setSelectedRoom(list[0].id);
      }
    } catch (e) {
      console.error('Error loading rooms:', e);
    }
  };

  // BLE scanning
  const startBLEScan = async () => {
    // Check if BLE native module is available
    if (!isBLEAvailable()) {
      setProvisioningError('BLE not available in Expo Go. Build a development client for Bluetooth support.');
      Alert.alert(
        'Expo Go Limitation',
        'Bluetooth provisioning requires a development build.\n\nRun: npx expo run:android\nOr: eas build --profile development',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsScanning(true);
    setBleDevices([]);
    setSelectedBleDevice(null);
    setProvisioningError('');

    try {
      const btEnabled = await checkBluetoothEnabled();
      if (!btEnabled) {
        setBluetoothEnabled(false);
        Alert.alert('Bluetooth Off', 'Please enable Bluetooth to find your device');
        setIsScanning(false);
        return;
      }
      setBluetoothEnabled(true);

      await scanForDevices(
        (device: BLEDevice) => {
          setBleDevices(prev => {
            // Avoid duplicates
            if (prev.find(d => d.id === device.id)) return prev;
            return [...prev, device];
          });
        },
        15000 // 15 second scan
      );
    } catch (error: any) {
      console.error('[BLE] Scan error:', error);
      setProvisioningError(error.message || 'Bluetooth scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Check Bluetooth when entering WiFi step
  useEffect(() => {
    if (step === 'wifi' && (deviceType === 'airguard' || isAirguardFlow)) {
      startBLEScan();
    }
    return () => {
      stopScan();
    };
  }, [step, deviceType, isAirguardFlow]);

  const handleSelectType = (type: DeviceType) => {
    setDeviceType(type);
    if (type === 'airguard') {
      setDeviceCategory('Sensor');
    }
    setStep('config');
  };

  const handleCreateDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter device name');
      return;
    }
    if (!selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }
    const homeId = user?.homeId;
    if (!isDemoMode && !homeId) {
      Alert.alert('Error', 'Missing home context. Please sign in again.');
      return;
    }

    const normalizedHubId = typeof hubId === 'string' ? hubId.trim() : '';
    const isAirguard = deviceType === 'airguard';
    if (!isDemoMode && !isAirguard && (!normalizedHubId || normalizedHubId.length === 0)) {
      Alert.alert('Missing Hub', 'Please pair a hub first, then add the device from that hub setup flow.');
      return;
    }

    const smartMonitorId = Number(String(airguardSmartMonitorId || '').trim());
    if (isAirguard && (!Number.isFinite(smartMonitorId) || smartMonitorId <= 0)) {
      Alert.alert('Error', 'Please enter a valid SmartMonitor ID (e.g., 1).');
      return;
    }
    
    setLoading(true);
    try {
      if (isDemoMode) {
        const createdId = demo.addDevice({
          name: deviceName,
          type: (deviceType || 'sensor') as any,
          category: (deviceType === 'airguard' ? 'Sensor' : deviceCategory) as any,
          roomId: selectedRoom,
          hubId: hubId || 'demo-hub',
          isActive: true,
          unit: deviceType === 'ac' ? '°C' : undefined,
        });

        setDeviceId(createdId);
        setStep('ready');
        return;
      }

      if (!homeId) {
        Alert.alert('Error', 'Missing home context. Please sign in again.');
        return;
      }

      if (isAirguard) {
        try {
          const existingRes = await hubApi.listDevices(homeId);
          const existingList =
            (existingRes as any)?.data?.data?.devices ?? (existingRes as any)?.data?.devices ?? [];
          const existingDevices = Array.isArray(existingList) ? existingList : [];
          const dup = existingDevices.find((d: any) => {
            if (d?.type !== 'airguard') return false;
            const sm =
              (d?.signalMappings as any)?.smartMonitorId ??
              (d?.signal_mappings as any)?.smartMonitorId ??
              (d?.signal_mappings as any)?.smartmonitorId;
            return Number(sm) === smartMonitorId;
          });
          if (dup) {
            Alert.alert('Already Added', `An Airguard with SmartMonitor ID ${smartMonitorId} already exists.`);
            return;
          }
        } catch {
          // ignore preflight errors; backend will still accept the request
        }
      }

      // For Airguard, DON'T create device yet - wait until WiFi provisioning succeeds
      if (deviceType === 'airguard') {
        // Store config for later, go to WiFi step
        setStep('wifi');
        return;
      }

      // For non-Airguard devices, create now
      const response = await hubApi.addDevice(homeId, {
        name: deviceName,
        type: deviceType,
        category: deviceCategory,
        roomId: selectedRoom,
        hubId: normalizedHubId || undefined,
      });

      const created = response.data?.data?.device ?? response.data?.device ?? response.data;
      const newDeviceId = created?.id || created?.deviceId;
      setDeviceId(newDeviceId);
      
      // For non-Airguard devices, continue with learning/WiFi
      // If IR/RF device, go to learning step
      if (deviceCategory === 'IR' || deviceCategory === 'RF') {
        setStep('learning');
      } else if (deviceCategory === 'WiFi') {
        setStep('wifi');
      } else {
        setStep('ready');
      }
    } catch (e: any) {
      const data = e?.response?.data;
      const base = data?.error || data?.message || e?.message || 'Failed to create device';
      const details = Array.isArray(data?.errors)
        ? data.errors.map((x: any) => x?.message).filter(Boolean).join('\n')
        : '';
      Alert.alert('Error', details ? `${base}\n${details}` : base);
    } finally {
      setLoading(false);
    }
  };

  const handleLearnSignal = async (action: string) => {
    if (!deviceId) return;
    
    setLearningAction(action);
    try {
      await hubApi.learnSignal(hubId, deviceId, action);
      setLearnedActions(new Set([...learnedActions, action]));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || `Failed to learn ${action}`);
    } finally {
      setLearningAction(null);
    }
  };

  const handleConnectDeviceWifi = async () => {
    if (!deviceWifiSSID.trim()) {
      Alert.alert('Error', 'Please enter your home WiFi name');
      return;
    }
    if (!deviceWifiPassword.trim()) {
      Alert.alert('Error', 'Please enter your WiFi password');
      return;
    }
    
    // For Airguard, require BLE device selection
    if (deviceType === 'airguard' && !selectedBleDevice) {
      Alert.alert('Error', 'Please select a device from the list');
      return;
    }
    
    const homeId = user?.homeId;
    if (!homeId) {
      Alert.alert('Error', 'Missing home context');
      return;
    }
    
    setLoading(true);
    setProvisioningError('');
    
    try {
      // For Airguard: Use BLE provisioning
      if (deviceType === 'airguard' && selectedBleDevice) {
        setProvisioningStep('Connecting via Bluetooth...');
        
        const result = await bleProvisionDevice(
          selectedBleDevice.id,
          deviceWifiSSID,
          deviceWifiPassword,
          (step: string) => setProvisioningStep(step)
        );

        if (!result.success || !result.deviceId) {
          setProvisioningError(result.error || 'Setup failed');
          Alert.alert('Setup Failed', result.error || 'Could not configure device');
          return;
        }

        // NOW create the device in our database (AFTER provisioning succeeds)
        const smartMonitorId = result.deviceId;
        setAirguardSmartMonitorId(smartMonitorId.toString());
        
        console.log('[Provisioning] BLE success, saving to database...');
        setProvisioningStep('Saving device to your home...');
        
        try {
          const devicePayload = {
            name: deviceName || `AirGuard ${smartMonitorId}`,
            type: 'airguard',
            category: 'Sensor',
            roomId: selectedRoom || undefined, // Optional room
            hubId: undefined, // AirGuard is standalone
            signalMappings: { smartMonitorId },
          };
          
          console.log('[Provisioning] Creating device:', devicePayload);
          const response = await hubApi.addDevice(homeId, devicePayload);
          console.log('[Provisioning] Device created:', response.data);

          const created = response.data?.data?.device ?? response.data?.device ?? response.data;
          const newDeviceId = created?.id || created?.deviceId;
          setDeviceId(newDeviceId);
          
          // Navigate back to devices screen which will auto-refresh and show the new device
          console.log('[Provisioning] Success! Navigating back...');
          setProvisioningStep('Success!');
          setLoading(false);
          
          setTimeout(() => {
            navigation.goBack();
          }, 500);
          return; // Exit early to prevent finally block from clearing state
        } catch (dbError: any) {
          console.error('[Provisioning] Failed to save device to database:', dbError);
          const errorMsg = dbError?.response?.data?.error || dbError?.response?.data?.message || dbError?.message || 'Unknown error';
          console.error('[Provisioning] Error details:', errorMsg);
          
          setLoading(false);
          Alert.alert(
            'Setup Complete, Save Failed',
            `Your device connected to WiFi successfully, but we couldn't add it to your home.\n\nError: ${errorMsg}\n\nTry adding it again from the Devices screen.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      } else {
        // Non-Airguard WiFi device (future support)
        Alert.alert('Info', 'WiFi device provisioning coming soon');
        setStep('ready');
      }
    } catch (e: any) {
      console.error('[Provisioning] Unexpected error:', e);
      const msg = e?.message || 'An error occurred';
      setProvisioningError(msg);
      Alert.alert('Error', msg);
    } finally {
      // Only clear states if we haven't already navigated away
      if (loading) {
        setLoading(false);
        setProvisioningStep('');
      }
    }
  };

  // Device Type Selection
  const renderTypeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Device Type</Text>
      <Text style={styles.stepDescription}>
        Choose the type of device you want to add
      </Text>
      
      <View style={styles.deviceTypesGrid}>
        {DEVICE_TYPES.map(({ type, icon: Icon, name }) => (
          <TouchableOpacity
            key={type}
            style={styles.deviceTypeCard}
            onPress={() => handleSelectType(type)}
          >
            <View style={styles.deviceTypeIcon}>
              <Icon size={32} color={colors.primary} />
            </View>
            <Text style={styles.deviceTypeName}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Device Configuration
  const renderConfigStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Configure Device</Text>
      <Text style={styles.stepDescription}>
        Enter device details and select room
      </Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Device Name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder={`e.g., ${deviceType === 'ac' ? 'Living Room AC' : deviceType === 'tv' ? 'Living Room TV' : 'Device Name'}`}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Category</Text>
        {deviceType === 'airguard' ? (
          <View style={styles.categoryGrid}>
            <View style={[styles.categoryButton, styles.categoryButtonSelected]}>
              <Text style={[styles.categoryButtonText, styles.categoryButtonTextSelected]}>Sensor</Text>
            </View>
          </View>
        ) : (
          <View style={styles.categoryGrid}>
            {['IR', 'RF', 'Relay', 'Sensor', 'Zigbee', 'Matter', 'WiFi'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  deviceCategory === cat && styles.categoryButtonSelected,
                ]}
                onPress={() => setDeviceCategory(cat as DeviceCategory)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    deviceCategory === cat && styles.categoryButtonTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {deviceType === 'airguard' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>SmartMonitor ID</Text>
          <TextInput
            style={styles.input}
            value={airguardSmartMonitorId}
            onChangeText={setAirguardSmartMonitorId}
            keyboardType="number-pad"
            placeholder="e.g., 1"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Room</Text>
        <ScrollView style={styles.roomsList}>
          {safeAvailableRooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomCard,
                selectedRoom === room.id && styles.roomCardSelected,
              ]}
              onPress={() => setSelectedRoom(room.id)}
            >
              <Text
                style={[
                  styles.roomName,
                  selectedRoom === room.id && styles.roomNameSelected,
                ]}
              >
                {room.name}
              </Text>
              {selectedRoom === room.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleCreateDevice}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Signal Learning
  const renderLearningStep = () => {
    const actions = DEVICE_ACTIONS[deviceType || ''] || [];
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Learn Device Signals</Text>
        <Text style={styles.stepDescription}>
          Point your remote at the hub and press each button on your remote
        </Text>
        
        <View style={styles.actionsGrid}>
          {actions.map((action) => {
            const isLearned = learnedActions.has(action);
            const isLearning = learningAction === action;
            
            return (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionButton,
                  isLearned && styles.actionButtonLearned,
                  isLearning && styles.actionButtonLearning,
                ]}
                onPress={() => handleLearnSignal(action)}
                disabled={isLearning || isLearned}
              >
                {isLearning ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isLearned ? (
                  <CheckCircle size={24} color={colors.success || '#10b981'} />
                ) : null}
                <Text
                  style={[
                    styles.actionButtonText,
                    isLearned && styles.actionButtonTextLearned,
                  ]}
                >
                  {action.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text style={styles.learningHint}>
          {learningAction
            ? `Press ${learningAction.replace('_', ' ')} on your remote now...`
            : 'Tap each button to learn the signal'}
        </Text>
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            learnedActions.size < actions.length && styles.buttonDisabled,
          ]}
          onPress={() => setStep('ready')}
          disabled={learnedActions.size < actions.length}
        >
          <Text style={styles.primaryButtonText}>
            {learnedActions.size === actions.length ? 'Continue' : `Learn ${actions.length - learnedActions.size} more`}
          </Text>
          <ArrowRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  // WiFi Device Configuration (with BLE for Airguard)
  const renderWifiStep = () => (
    <View style={styles.stepContainer}>
      <LinearGradient
        colors={[`${colors.primary}20`, 'transparent']}
        style={styles.iconGradientBg}
      >
        <View style={styles.iconContainer}>
          {deviceType === 'airguard' ? (
            <Bluetooth size={48} color={colors.primary} />
          ) : (
            <Wifi size={48} color={colors.primary} />
          )}
        </View>
      </LinearGradient>
      <Text style={styles.stepTitle}>
        {deviceType === 'airguard' ? 'Connect via Bluetooth' : 'Connect Device to WiFi'}
      </Text>
      <Text style={styles.stepDescription}>
        {deviceType === 'airguard' 
          ? 'Select your device from the list below, then enter your WiFi credentials. Your phone stays connected to the internet!'
          : 'Enter WiFi credentials for your device'}
      </Text>

      {/* BLE Device Scanner for Airguard */}
      {deviceType === 'airguard' && (
        <View style={styles.inputContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.inputLabel}>Nearby Devices</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={startBLEScan}
              disabled={isScanning}
            >
              <RefreshCw 
                size={20} 
                color={colors.primary} 
                style={isScanning ? styles.spinning : undefined}
              />
            </TouchableOpacity>
          </View>
          
          {!bluetoothEnabled && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Bluetooth is disabled. Please enable it in Settings.
              </Text>
            </View>
          )}
          
          {isScanning && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            </View>
          )}
          
          {!isScanning && bleDevices.length === 0 && bluetoothEnabled && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No devices found. Make sure your Airguard is powered on.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={startBLEScan}>
                <Text style={styles.retryButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <ScrollView style={styles.bleDeviceList}>
            {bleDevices.map((device) => (
              <TouchableOpacity
                key={device.id}
                style={[
                  styles.bleDeviceCard,
                  selectedBleDevice?.id === device.id && styles.bleDeviceCardSelected,
                ]}
                onPress={() => setSelectedBleDevice(device)}
              >
                <View style={styles.bleDeviceInfo}>
                  <Bluetooth 
                    size={24} 
                    color={selectedBleDevice?.id === device.id ? colors.primary : colors.mutedForeground} 
                  />
                  <View style={styles.bleDeviceText}>
                    <Text style={[
                      styles.bleDeviceName,
                      selectedBleDevice?.id === device.id && styles.bleDeviceNameSelected,
                    ]}>
                      {device.name}
                    </Text>
                    <View style={styles.bleDeviceMeta}>
                      <Signal size={12} color={colors.mutedForeground} />
                      <Text style={styles.bleDeviceSignal}>
                        {device.rssi > -60 ? 'Strong' : device.rssi > -80 ? 'Good' : 'Weak'}
                      </Text>
                    </View>
                  </View>
                </View>
                {selectedBleDevice?.id === device.id && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi Network Name</Text>
        <View style={styles.inputWrapper}>
          <Wifi size={18} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={deviceWifiSSID}
            onChangeText={setDeviceWifiSSID}
            placeholder="Enter your WiFi network name"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>WiFi Password</Text>
        <View style={styles.inputWrapper}>
          <Lock size={18} color={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIcon}
            value={deviceWifiPassword}
            onChangeText={setDeviceWifiPassword}
            placeholder="Enter your WiFi password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
      </View>

      {provisioningStep && (
        <View style={styles.provisioningStatus}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.provisioningText}>{provisioningStep}</Text>
        </View>
      )}

      {provisioningError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{provisioningError}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {deviceType === 'airguard' 
            ? '📶 We use Bluetooth to securely send WiFi credentials to your device. Your phone stays connected to the internet the entire time!'
            : '💡 Make sure the device is powered on and in pairing mode.'}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.primaryButton, 
          (loading || (deviceType === 'airguard' && !selectedBleDevice)) && styles.buttonDisabled
        ]}
        onPress={handleConnectDeviceWifi}
        disabled={loading || (deviceType === 'airguard' && !selectedBleDevice)}
      >
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButtonGradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {deviceType === 'airguard' 
                  ? (selectedBleDevice ? 'Configure Device' : 'Select a Device First')
                  : 'Connect Device'}
              </Text>
              <ArrowRight size={20} color="white" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Device Ready
  const renderReadyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color={colors.success || '#10b981'} />
      </View>
      <Text style={styles.stepTitle}>Device Ready!</Text>
      <Text style={styles.stepDescription}>
        Your device has been successfully added and configured.
      </Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Device Name</Text>
        <Text style={styles.infoValue}>{deviceName}</Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Type</Text>
        <Text style={styles.infoValue}>{deviceType?.toUpperCase()}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.primaryButtonText}>View Devices</Text>
        <ArrowRight size={20} color="white" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setStep('type');
          setDeviceType(null);
          setDeviceName('');
          setSelectedRoom('');
          setLearnedActions(new Set());
          setDeviceId('');
        }}
      >
        <Text style={styles.secondaryButtonText}>Add Another Device</Text>
      </TouchableOpacity>
    </View>
  );

  const stepIndex = Math.max(0, STEP_ORDER.indexOf(step));
  const heroTitle = step === 'ready' ? 'Device Ready' : 'Add Device';
  const heroMeta = step === 'ready'
    ? 'Setup complete'
    : `Step ${stepIndex + 1} of ${STEP_ORDER.length}`;
  const heroDescription = STEP_DESCRIPTIONS[step];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Add Device"
        showBack
        showSettings={false}
      />
      <CreationHero
        eyebrow="Device setup"
        title={heroTitle}
        description={heroDescription}
        meta={heroMeta}
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'type' && renderTypeStep()}
        {step === 'config' && renderConfigStep()}
        {step === 'learning' && renderLearningStep()}
        {step === 'wifi' && renderWifiStep()}
        {step === 'ready' && renderReadyStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradientBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  deviceTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  deviceTypeCard: {
    width: '30%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  deviceTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceTypeName: {
    fontSize: 12,
    color: colors.foreground,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputWrapper: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  inputWithIcon: {
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.foreground,
  },
  categoryButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  roomsList: {
    maxHeight: 200,
  },
  roomCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  roomName: {
    fontSize: 16,
    color: colors.foreground,
  },
  roomNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: 100,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonLearned: {
    backgroundColor: `${colors.success}20`,
    borderColor: colors.success || '#10b981',
  },
  actionButtonLearning: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.foreground,
    textAlign: 'center',
  },
  actionButtonTextLearned: {
    color: colors.success || '#10b981',
    fontWeight: '600',
  },
  learningHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '100%',
    marginTop: spacing.lg,
  },
  primaryButtonGradient: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  provisioningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}15`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  provisioningText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: `${colors.destructive || '#ef4444'}15`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.destructive || '#ef4444',
  },
  infoBox: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '600',
  },
  // BLE Device styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  spinning: {
    opacity: 0.5,
  },
  warningBox: {
    backgroundColor: `${colors.destructive || '#ef4444'}15`,
    borderWidth: 1,
    borderColor: `${colors.destructive || '#ef4444'}40`,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  warningText: {
    fontSize: 14,
    color: colors.destructive || '#ef4444',
    fontWeight: '500',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  scanningText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  bleDeviceList: {
    maxHeight: 180,
  },
  bleDeviceCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bleDeviceCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  bleDeviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bleDeviceText: {
    gap: spacing.xs,
  },
  bleDeviceName: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '500',
  },
  bleDeviceNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  bleDeviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bleDeviceSignal: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});

