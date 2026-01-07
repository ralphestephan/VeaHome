import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Power,
  Lightbulb,
  Thermometer,
  Snowflake,
  Flame,
  Fan,
  Wind,
  Tv,
  Speaker,
  Blinds,
  Lock,
  Camera,
  Sun,
  Moon,
  Clock,
  RotateCcw,
  Droplets,
  Volume2,
  VolumeX,
  Trash2,
  CloudOff,
  Settings,
  Check,
  AlertTriangle,
  Wifi,
  WifiOff,
  Edit2,
  MapPin,
  ChevronDown,
  Home,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { Device } from '../types';
import { getApiClient, PublicAirguardApi } from '../services/api';
import AirguardAlertBanner, { getAlertInfo, decodeAlertFlags } from './AirguardAlertBanner';
import { reprovisionDevice, cleanupBLE } from '../utils/bleReprovision';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DIAL_SIZE = 220;
const DIAL_STROKE = 12;

interface DeviceControlModalProps {
  visible: boolean;
  device: Device | null;
  onClose: () => void;
  onToggle: (deviceId: string) => void;
  onSetValue: (deviceId: string, value: number) => void;
  onSetMode?: (deviceId: string, mode: string) => void;
  onToggleMute?: (deviceId: string, muted: boolean) => void;
  onDelete?: (deviceId: string) => void;
  onUpdateName?: (deviceId: string, newName: string) => void;
  onUpdateRoom?: (deviceId: string, roomId: string | null) => void;
  rooms?: Array<{ id: string; name: string }>;
}

const iconMap: Record<string, any> = {
  'light': Lightbulb,
  'lightbulb': Lightbulb,
  'thermostat': Thermometer,
  'ac': Snowflake,
  'fan': Wind,
  'tv': Tv,
  'speaker': Speaker,
  'blinds': Blinds,
  'shutter': Blinds,
  'lock': Lock,
  'camera': Camera,
  'airguard': Wind,
};

export default function DeviceControlModal({
  visible,
  device,
  onClose,
  onToggle,
  onSetValue,
  onSetMode,
  onToggleMute,
  onDelete,
  onUpdateName,
  onUpdateRoom,
  rooms = [],
}: DeviceControlModalProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [localValue, setLocalValue] = useState(device?.value ?? 0);
  const [localMode, setLocalMode] = useState<string>('manual');
  // Don't show as active if device is offline
  const [isActive, setIsActive] = useState((device?.isOnline !== false) && (device?.isActive ?? false));

  // Live airguard data state
  const [liveAirguardData, setLiveAirguardData] = useState<{
    temperature?: number;
    humidity?: number;
    dust?: number;
    mq2?: number;
    buzzer?: boolean;
    isOnline?: boolean;
    alertFlags?: number;
    rssi?: number;
  } | null>(null);

  // Threshold state for Airguard (min/max for temp & humidity)
  const [thresholds, setThresholds] = useState({
    tempHigh: 35,
    tempLow: 10,
    humidityHigh: 80,
    humidityLow: 20,
    dustHigh: 400,
    mq2High: 60,
  });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState({
    tempHigh: '35',
    tempLow: '10',
    humidityHigh: '80',
    humidityLow: '20',
    dustHigh: '400',
    mq2High: '60',
  });
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [togglingMute, setTogglingMute] = useState(false);
  const [loadingAirguardData, setLoadingAirguardData] = useState(false);

  // Edit name state
  const [showEditName, setShowEditName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Room assignment state
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  // Reprovision state
  const [showReprovisionModal, setShowReprovisionModal] = useState(false);
  const [reprovisionSSID, setReprovisionSSID] = useState((device as any)?.wifiSsid || '');
  const [reprovisionPassword, setReprovisionPassword] = useState('');
  const [reprovisioning, setReprovisioning] = useState(false);

  // Attach Device modal state
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Local state to track current display values (updates immediately after save)
  const [displayName, setDisplayName] = useState(device?.name || '');
  const [displayRoomId, setDisplayRoomId] = useState(device?.roomId);

  // Update display values when device prop changes
  useEffect(() => {
    console.log('[DeviceControlModal] Device prop changed:', { deviceId: device?.id, deviceName: device?.name, deviceRoomId: device?.roomId, currentDisplayRoomId: displayRoomId });
    setDisplayName(device?.name || '');
    const newRoomId = device?.roomId || null;
    if (String(newRoomId) !== String(displayRoomId)) {
      console.log('[DeviceControlModal] Updating displayRoomId from', displayRoomId, 'to', newRoomId);
      setDisplayRoomId(newRoomId);
    }
    // Update reprovision SSID if device has wifiSsid
    if ((device as any)?.wifiSsid) {
      setReprovisionSSID((device as any).wifiSsid);
    }
  }, [device?.id, device?.name, device?.roomId, (device as any)?.wifiSsid]);

  // Cleanup BLE on unmount
  useEffect(() => {
    return () => {
      cleanupBLE();
    };
  }, []);

  // Confirmation popup state (Vealive styled, replaces Alert.alert)
  const [confirmPopup, setConfirmPopup] = useState<{
    visible: boolean;
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  // Memoize API client
  const airguardApi = useMemo(() => PublicAirguardApi(getApiClient()), []);

  // Helper to get smartMonitorId from device (can be in signalMappings or metadata)
  const getSmartMonitorId = useCallback((): string | number | null => {
    if (!device) return null;

    // For hubs, check metadata first (hubs have metadata directly)
    if (device.metadata?.smartMonitorId) {
      return device.metadata.smartMonitorId;
    }

    // Check signalMappings (for regular devices)
    const fromSignalMappings = (device.signalMappings as any)?.smartMonitorId ??
      (device.signalMappings as any)?.smartmonitorId;
    if (fromSignalMappings) return fromSignalMappings;

    // Try to extract from serialNumber for hubs (e.g., "SM_1" -> 1)
    if (device.serialNumber && typeof device.serialNumber === 'string') {
      const match = device.serialNumber.match(/SM_(\d+)/i);
      if (match) return parseInt(match[1], 10);
    }

    return null;
  }, [device]);

  // Fetch latest airguard data
  const fetchAirguardData = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;

    const smartMonitorId = getSmartMonitorId();
    if (!smartMonitorId) {
      console.warn('[Airguard] No smartMonitorId found on device:', device.id);
      return;
    }

    setLoadingAirguardData(true);
    try {
      const [latestRes, statusRes] = await Promise.all([
        airguardApi.getLatest(smartMonitorId),
        airguardApi.getStatus(smartMonitorId),
      ]);

      const latestWrapper = latestRes.data?.data;
      const statusWrapper = statusRes.data?.data;

      // Extract actual data from the wrapper
      const latest = latestWrapper?.data || latestWrapper;
      const status = statusWrapper?.data || statusWrapper;

      if (!latest) {
        setLiveAirguardData(null);
        return;
      }

      const newData = {
        temperature: latest.temperature,
        humidity: latest.humidity,
        dust: latest.dust || latest.pm25 || latest.aqi,
        mq2: latest.mq2,
        buzzer: latest.buzzer === 1 || latest.buzzer === true || latest.buzzerEnabled === true,
        isOnline: status?.online === true || status?.online === 1,
        alertFlags: latest.alertFlags || 0,
        rssi: latest.rssi,
      };

      setLiveAirguardData(newData);
    } catch (error) {
      console.error('[Airguard] Failed to fetch data:', error);
      setLiveAirguardData(null);
    } finally {
      setLoadingAirguardData(false);
    }
  }, [device, airguardApi, getSmartMonitorId]);

  // Fetch thresholds when modal opens
  const fetchThresholds = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;

    const smartMonitorId = getSmartMonitorId();
    if (!smartMonitorId) return;

    try {
      const res = await airguardApi.getThresholds(smartMonitorId);

      const data = res.data?.data?.data || res.data?.data;

      if (data && typeof data === 'object') {
        const newThresholds = {
          tempHigh: data.tempMax ?? 35,
          tempLow: data.tempMin ?? 10,
          humidityHigh: data.humMax ?? 80,
          humidityLow: data.humMin ?? 20,
          dustHigh: data.dustHigh ?? 400,
          mq2High: data.mq2High ?? 60,
        };
        setThresholds(newThresholds);
        setEditingThresholds({
          tempHigh: String(newThresholds.tempHigh),
          tempLow: String(newThresholds.tempLow),
          humidityHigh: String(newThresholds.humidityHigh),
          humidityLow: String(newThresholds.humidityLow),
          dustHigh: String(newThresholds.dustHigh),
          mq2High: String(newThresholds.mq2High),
        });
      } else {
        console.warn('[Thresholds] No data in response or invalid format, using defaults');
      }
    } catch (error) {
      console.error('[Thresholds] Failed to fetch:', error);
    }
  }, [device, airguardApi, getSmartMonitorId]);

  // Toggle mute/unmute buzzer - simple MQTT command
  const handleMuteToggle = useCallback(async (wantMuted: boolean) => {
    if (!device || device.type !== 'airguard') return;

    const smartMonitorId = getSmartMonitorId();
    if (!smartMonitorId) return;

    setTogglingMute(true);
    try {
      // wantMuted=true means turn buzzer OFF, wantMuted=false means turn buzzer ON
      const targetState = wantMuted ? 'OFF' : 'ON';
      console.log(`[Airguard] Sending buzzer command: ${targetState}`);
      await airguardApi.setBuzzer(smartMonitorId, targetState);

      // Update local state optimistically
      setLiveAirguardData(prev => prev ? { ...prev, buzzer: !wantMuted } : null);

      // Force immediate sync from backend after 500ms to get actual state
      setTimeout(() => {
        fetchAirguardData();
        setTogglingMute(false);
      }, 500);
    } catch (error: any) {
      console.error('[Airguard] Failed to toggle buzzer:', error);
      setTogglingMute(false);
    }
  }, [device, airguardApi, getSmartMonitorId, fetchAirguardData]);

  // Save thresholds to device via MQTT (with min/max support)
  const saveThresholds = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;

    const smartMonitorId = getSmartMonitorId();
    if (!smartMonitorId) {
      setConfirmPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No SmartMonitor ID found for this device. Please re-add the device.',
      });
      return;
    }

    // Validate inputs
    const tempHigh = parseFloat(editingThresholds.tempHigh);
    const tempLow = parseFloat(editingThresholds.tempLow);
    const humidityHigh = parseFloat(editingThresholds.humidityHigh);
    const humidityLow = parseFloat(editingThresholds.humidityLow);
    const dustHigh = parseFloat(editingThresholds.dustHigh);
    const mq2High = parseFloat(editingThresholds.mq2High);

    // Validation
    if (isNaN(tempHigh) || isNaN(tempLow) || isNaN(humidityHigh) || isNaN(humidityLow) || isNaN(dustHigh) || isNaN(mq2High)) {
      setConfirmPopup({
        visible: true,
        type: 'error',
        title: 'Invalid Input',
        message: 'Please enter valid numbers for all thresholds.',
      });
      return;
    }

    if (tempLow >= tempHigh) {
      setConfirmPopup({
        visible: true,
        type: 'error',
        title: 'Invalid Range',
        message: 'Temperature min must be less than max.',
      });
      return;
    }

    if (humidityLow >= humidityHigh) {
      setConfirmPopup({
        visible: true,
        type: 'error',
        title: 'Invalid Range',
        message: 'Humidity min must be less than max.',
      });
      return;
    }

    // Local state values
    const newThresholds = {
      tempHigh,
      tempLow,
      humidityHigh,
      humidityLow,
      dustHigh,
      mq2High,
    };

    // Map to API field names
    const apiPayload = {
      tempMax: newThresholds.tempHigh,
      tempMin: newThresholds.tempLow,
      humMax: newThresholds.humidityHigh,
      humMin: newThresholds.humidityLow,
      dustHigh: newThresholds.dustHigh,
      mq2High: newThresholds.mq2High,
    };

    setSavingThresholds(true);
    try {
      console.log('[Airguard] Saving thresholds:', apiPayload);
      const response = await airguardApi.setThresholds(smartMonitorId, apiPayload);
      console.log('[Airguard] Save response:', response.data);

      const responseData = response.data?.data ?? response.data;
      const mqttConnected = responseData?.mqttConnected !== false;

      setThresholds(newThresholds);
      setShowThresholdSettings(false);

      if (!mqttConnected) {
        setConfirmPopup({
          visible: true,
          type: 'warning',
          title: 'MQTT Not Connected',
          message: `Thresholds saved but MQTT offline.\n\nTemp: ${tempLow}°C - ${tempHigh}°C\nHumidity: ${humidityLow}% - ${humidityHigh}%`,
        });
      } else {
        setConfirmPopup({
          visible: true,
          type: 'success',
          title: 'Thresholds Saved',
          message: `Temp: ${tempLow}°C - ${tempHigh}°C\nHumidity: ${humidityLow}% - ${humidityHigh}%\nDust: ${dustHigh} µg/m³\nGas: ${mq2High}`,
        });
      }
    } catch (error: any) {
      console.error('[Airguard] Failed to save thresholds:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      setConfirmPopup({
        visible: true,
        type: 'error',
        title: 'Failed to Save',
        message: `Could not send thresholds.\n\n${errorMessage}`,
      });
    } finally {
      setSavingThresholds(false);
    }
  }, [device, editingThresholds, airguardApi, getSmartMonitorId]);

  // Poll airguard data while modal is visible
  useEffect(() => {
    if (!visible || !device || device.type !== 'airguard') {
      setLiveAirguardData(null);
      setLoadingAirguardData(false);
      setShowThresholdSettings(false);
      setTogglingMute(false);
      return;
    }

    const smartMonitorId = getSmartMonitorId();
    if (!smartMonitorId) return;

    // Initial fetch
    fetchAirguardData();
    fetchThresholds();

    // Poll every 2 seconds for live updates - ALWAYS sync, no pauses
    const interval = setInterval(() => {
      fetchAirguardData();
    }, 2000);

    return () => {
      clearInterval(interval);
      setTogglingMute(false);
    };
  }, [visible, device, fetchAirguardData, fetchThresholds, getSmartMonitorId]);

  useEffect(() => {
    if (device) {
      setLocalValue(device.value ?? (device.type === 'thermostat' || device.type === 'ac' ? 22 : 100));
      setLocalMode('manual');
      // Don't show as active if device is offline
      setIsActive((device.isOnline !== false) && (device.isActive ?? false));
    }
  }, [device]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible]);

  if (!device) return null;

  const IconComponent = iconMap[device.type] || Lightbulb;
  const isClimateDevice = device.type === 'thermostat' || device.type === 'ac';
  const isAirguard = device.type === 'airguard';
  const isDimmable = device.type === 'light';
  const isFan = device.type === 'fan';
  const isBlinds = device.type === 'blind' || device.type === 'shutter';

  const handleToggle = () => {
    setIsActive(!isActive);
    onToggle(device.id);
  };

  const handleValueChange = (value: number) => {
    setLocalValue(value);
  };

  const handleValueChangeComplete = (value: number) => {
    onSetValue(device.id, value);
  };

  const handleModeChange = (mode: string) => {
    setLocalMode(mode);
    onSetMode?.(device.id, mode);
  };

  const getValueLabel = () => {
    if (isClimateDevice) return `${Math.round(localValue)}°C`;
    if (isDimmable) return `${Math.round(localValue)}%`;
    if (isFan) return `${Math.round(localValue)}%`;
    if (isBlinds) return `${Math.round(localValue)}%`;
    return `${Math.round(localValue)}`;
  };

  // Calculate signal strength from RSSI
  const getSignalStrength = (rssi: number | undefined): { strength: string; bars: number; color: string } => {
    if (!rssi || rssi === 0) return { strength: 'N/A', bars: 0, color: colors.mutedForeground };

    // RSSI ranges: Excellent > -50, Good > -60, Fair > -70, Poor <= -70
    if (rssi > -50) {
      return { strength: 'Excellent', bars: 4, color: '#4CAF50' };
    } else if (rssi > -60) {
      return { strength: 'Good', bars: 3, color: colors.primary };
    } else if (rssi > -70) {
      return { strength: 'Fair', bars: 2, color: '#FFD166' };
    } else {
      return { strength: 'Poor', bars: 1, color: '#FF6B6B' };
    }
  };

  const getMinMax = () => {
    if (isClimateDevice) return { min: 16, max: 30 };
    return { min: 0, max: 100 };
  };

  const { min, max } = getMinMax();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        </TouchableOpacity>

        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[colors.card, colors.cardAlt]}
            style={styles.modal}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                  <IconComponent size={24} color={isActive ? '#fff' : colors.primary} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.deviceName}>{displayName}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingName(displayName);
                        setShowEditName(true);
                      }}
                      style={styles.editIconButton}
                    >
                      <Edit2 size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  {displayRoomId ? (
                    <TouchableOpacity
                      onPress={() => setShowRoomPicker(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={styles.deviceRoom}>
                        {rooms.find(r => r.id === displayRoomId)?.name || displayRoomId}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowRoomPicker(true)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <MapPin size={12} color={colors.mutedForeground} />
                      <Text style={styles.deviceNoRoom}>Assign to room</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.headerRight}>
                {/* Reprovision button - only show for devices that support BLE */}
                {device.type === 'airguard' || device.hubType === 'airguard' ? (
                  <TouchableOpacity
                    onPress={() => setShowReprovisionModal(true)}
                    style={styles.reprovisionButton}
                    disabled={reprovisioning}
                  >
                    <RefreshCw size={18} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
                {onDelete && (
                  <TouchableOpacity onPress={() => onDelete(device.id)} style={styles.trashButton}>
                    <Trash2 size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Control Area */}
            {isAirguard ? (
              <>
                <ScrollView
                  style={styles.airguardControl}
                  contentContainerStyle={styles.airguardControlContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Online/Offline Status Badge */}
                  <View style={styles.statusBadgeContainer}>
                    <View style={[
                      styles.statusBadge,
                      liveAirguardData?.isOnline ? styles.statusOnline : styles.statusOffline
                    ]}>
                      <View style={[
                        styles.statusDot,
                        liveAirguardData?.isOnline ? styles.dotOnline : styles.dotOffline
                      ]} />
                      <Text style={[
                        styles.statusText,
                        liveAirguardData?.isOnline ? styles.statusTextOnline : styles.statusTextOffline
                      ]}>
                        {liveAirguardData?.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>

                  {/* Signal Strength Indicator - Only show when online with signal */}
                  {liveAirguardData?.rssi && liveAirguardData?.isOnline !== false && (
                    <View style={styles.statusRow}>
                      <View style={styles.signalStrengthContainer}>
                        {(() => {
                          const signal = getSignalStrength(liveAirguardData.rssi);
                          return (
                            <>
                              <View style={styles.signalBars}>
                                {[1, 2, 3, 4].map((bar) => (
                                  <View
                                    key={bar}
                                    style={[
                                      styles.signalBar,
                                      { height: bar * 4 },
                                      bar <= signal.bars && { backgroundColor: signal.color },
                                    ]}
                                  />
                                ))}
                              </View>
                              <Text style={[styles.signalText, { color: signal.color }]}>
                                {signal.strength}
                              </Text>
                            </>
                          );
                        })()}
                      </View>
                    </View>
                  )}

                  {/* Alert banner using new component - ONLY use live data when available */}
                  <AirguardAlertBanner
                    alertFlags={(() => {
                      const flags = liveAirguardData?.alertFlags ?? 0;
                      console.log('[AlertBanner] AlertFlags:', flags, 'Sensor data:', {
                        temp: liveAirguardData?.temperature,
                        hum: liveAirguardData?.humidity,
                        dust: liveAirguardData?.dust,
                        mq2: liveAirguardData?.mq2
                      }, 'Thresholds:', thresholds);
                      return flags;
                    })()}
                    sensorData={{
                      temperature: liveAirguardData?.temperature,
                      humidity: liveAirguardData?.humidity,
                      dust: liveAirguardData?.dust,
                      mq2: liveAirguardData?.mq2,
                    }}
                    thresholds={{
                      tempHigh: thresholds.tempHigh,
                      tempLow: thresholds.tempLow,
                      humidityHigh: thresholds.humidityHigh,
                      humidityLow: thresholds.humidityLow,
                      dustHigh: thresholds.dustHigh,
                      mq2High: thresholds.mq2High,
                    }}
                    variant="full"
                    showOkStatus={true}
                  />

                  {/* Use live data only - show loading if not available */}
                  {(() => {
                    // Only use fresh live data, no fallbacks to stale device properties
                    const temp = liveAirguardData?.temperature;
                    const hum = liveAirguardData?.humidity;
                    const dust = liveAirguardData?.dust;
                    const mq2 = liveAirguardData?.mq2;
                    // buzzer: true = unmuted (alarm on), false = muted (alarm off)
                    const isMuted = liveAirguardData?.buzzer === false;

                    // Calculate alerts based on current values and thresholds
                    const tempAlert = temp != null && (temp > thresholds.tempHigh || temp < thresholds.tempLow);
                    const humAlert = hum != null && (hum > thresholds.humidityHigh || hum < thresholds.humidityLow);
                    const dustAlert = dust != null && dust > thresholds.dustHigh;
                    const mq2Alert = mq2 != null && mq2 > thresholds.mq2High;

                    return (
                      <>
                        {loadingAirguardData && !liveAirguardData && (
                          <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.mutedForeground, marginTop: 10 }}>
                              Loading sensor data...
                            </Text>
                          </View>
                        )}

                        <View style={styles.airguardMetrics}>
                          <LinearGradient
                            colors={tempAlert ? ['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.1)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                            style={[styles.airguardMetricCard, tempAlert && styles.alertMetricCard]}
                          >
                            <View style={styles.metricIconContainer}>
                              <Thermometer size={28} color={tempAlert ? '#FF6B6B' : '#4D7BFE'} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.airguardMetricValue, tempAlert && { color: '#FF6B6B' }]}>
                              {liveAirguardData?.isOnline === false ? '-' : (temp != null ? `${Number(temp).toFixed(1)}°` : '--')}
                            </Text>
                            <Text style={styles.airguardMetricLabel}>TEMPERATURE</Text>
                          </LinearGradient>

                          <LinearGradient
                            colors={humAlert ? ['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.1)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                            style={[styles.airguardMetricCard, humAlert && styles.alertMetricCard]}
                          >
                            <View style={styles.metricIconContainer}>
                              <Droplets size={28} color={humAlert ? '#FF6B6B' : '#4D7BFE'} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.airguardMetricValue, humAlert && { color: '#FF6B6B' }]}>
                              {liveAirguardData?.isOnline === false ? '-' : (hum != null ? `${Math.round(hum)}%` : '--')}
                            </Text>
                            <Text style={styles.airguardMetricLabel}>HUMIDITY</Text>
                          </LinearGradient>

                          <LinearGradient
                            colors={dustAlert ? ['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.1)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                            style={[styles.airguardMetricCard, dustAlert && styles.alertMetricCard]}
                          >
                            <View style={styles.metricIconContainer}>
                              <Wind size={28} color={dustAlert ? '#FF6B6B' : '#4D7BFE'} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.airguardMetricValue, dustAlert && { color: '#FF6B6B' }]}>
                              {liveAirguardData?.isOnline === false ? '-' : (dust != null ? `${dust}` : '--')}
                            </Text>
                            <Text style={styles.airguardMetricLabel}>DUST</Text>
                          </LinearGradient>

                          <LinearGradient
                            colors={mq2Alert ? ['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.1)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                            style={[styles.airguardMetricCard, mq2Alert && styles.alertMetricCard]}
                          >
                            <View style={styles.metricIconContainer}>
                              <Fan size={28} color={mq2Alert ? '#FF6B6B' : '#4D7BFE'} strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.airguardMetricValue, mq2Alert && { color: '#FF6B6B' }]}>
                              {liveAirguardData?.isOnline === false ? '-' : (mq2 != null ? `${mq2}` : '--')}
                            </Text>
                            <Text style={styles.airguardMetricLabel}>GAS/SMOKE</Text>
                          </LinearGradient>
                        </View>

                        <TouchableOpacity
                          style={[styles.muteButton, isMuted && styles.muteButtonActive]}
                          onPress={() => {
                            handleMuteToggle(!isMuted);
                          }}
                          disabled={togglingMute || !liveAirguardData?.isOnline}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={isMuted ? ['#FF6B6B', '#FF8E53'] : [colors.muted, colors.muted]}
                            style={styles.muteButtonGradient}
                          >
                            {togglingMute ? (
                              <ActivityIndicator size="small" color={isMuted ? '#fff' : colors.mutedForeground} />
                            ) : isMuted ? (
                              <VolumeX size={22} color="#fff" />
                            ) : (
                              <Volume2 size={22} color={colors.mutedForeground} />
                            )}
                            <Text style={[styles.muteLabel, isMuted && styles.muteLabelActive]}>
                              {togglingMute ? 'Updating...' : isMuted ? 'Alarm Muted' : 'Mute Alarm'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        {/* Threshold Settings Button */}
                        <TouchableOpacity
                          style={[styles.thresholdToggle, !liveAirguardData?.isOnline && { opacity: 0.5 }]}
                          onPress={() => {
                            fetchThresholds(); // Fetch current thresholds before opening
                            setShowThresholdSettings(true);
                          }}
                          disabled={!liveAirguardData?.isOnline}
                          activeOpacity={0.8}
                        >
                          <Settings size={18} color={colors.mutedForeground} />
                          <Text style={styles.thresholdToggleText}>
                            Threshold Settings
                          </Text>
                        </TouchableOpacity>

                        {/* Attach Device Button for AirGuard */}
                        <TouchableOpacity
                          style={{
                            marginTop: spacing.md,
                            borderRadius: borderRadius.lg,
                            overflow: 'hidden',
                            ...shadows.md,
                          }}
                          onPress={() => {
                            setShowAttachModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.neonCyan]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: spacing.sm,
                              paddingVertical: spacing.md,
                              paddingHorizontal: spacing.lg,
                            }}
                          >
                            <Plus size={20} color="#fff" />
                            <Text style={{
                              color: '#fff',
                              fontSize: 15,
                              fontWeight: '600',
                            }}>
                              Attach Device
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </ScrollView>

                {/* Threshold Settings Popup Modal */}
                <Modal
                  visible={showThresholdSettings}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowThresholdSettings(false)}
                >
                  <View style={styles.thresholdModalOverlay}>
                    <TouchableOpacity
                      style={StyleSheet.absoluteFill}
                      onPress={() => setShowThresholdSettings(false)}
                      activeOpacity={1}
                    >
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                    </TouchableOpacity>

                    <View style={styles.thresholdModalContent}>
                      <LinearGradient
                        colors={[colors.card, colors.cardAlt]}
                        style={styles.thresholdModalInner}
                      >
                        {/* Header */}
                        <View style={styles.thresholdModalHeader}>
                          <Text style={styles.thresholdModalTitle}>Alert Thresholds</Text>
                          <TouchableOpacity onPress={() => setShowThresholdSettings(false)} style={styles.thresholdModalClose}>
                            <X size={20} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.thresholdModalSubtitle}>
                          Set the min/max values at which alerts will trigger
                        </Text>

                        <ScrollView style={styles.thresholdScrollView} showsVerticalScrollIndicator={false}>
                          {/* Temperature Section */}
                          <View style={styles.thresholdSection}>
                            <View style={styles.thresholdSectionHeader}>
                              <Thermometer size={20} color={colors.primary} />
                              <Text style={styles.thresholdSectionTitle}>Temperature (°C)</Text>
                            </View>
                            <View style={styles.thresholdMinMaxRow}>
                              <View style={styles.thresholdMinMaxGroup}>
                                <Text style={styles.thresholdMinMaxLabel}>Min</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.tempLow}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, tempLow: text }))}
                                  keyboardType="numeric"
                                  placeholder="10"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                              <View style={styles.thresholdMinMaxGroup}>
                                <Text style={styles.thresholdMinMaxLabel}>Max</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.tempHigh}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, tempHigh: text }))}
                                  keyboardType="numeric"
                                  placeholder="35"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Humidity Section */}
                          <View style={styles.thresholdSection}>
                            <View style={styles.thresholdSectionHeader}>
                              <Droplets size={20} color={colors.primary} />
                              <Text style={styles.thresholdSectionTitle}>Humidity (%)</Text>
                            </View>
                            <View style={styles.thresholdMinMaxRow}>
                              <View style={styles.thresholdMinMaxGroup}>
                                <Text style={styles.thresholdMinMaxLabel}>Min</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.humidityLow}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, humidityLow: text }))}
                                  keyboardType="numeric"
                                  placeholder="20"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                              <View style={styles.thresholdMinMaxGroup}>
                                <Text style={styles.thresholdMinMaxLabel}>Max</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.humidityHigh}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, humidityHigh: text }))}
                                  keyboardType="numeric"
                                  placeholder="80"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Dust Section */}
                          <View style={styles.thresholdSection}>
                            <View style={styles.thresholdSectionHeader}>
                              <Wind size={20} color={colors.primary} />
                              <Text style={styles.thresholdSectionTitle}>Dust (µg/m³)</Text>
                            </View>
                            <View style={styles.thresholdMinMaxRow}>
                              <View style={[styles.thresholdMinMaxGroup, { flex: 1 }]}>
                                <Text style={styles.thresholdMinMaxLabel}>Max Threshold</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.dustHigh}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, dustHigh: text }))}
                                  keyboardType="numeric"
                                  placeholder="400"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Gas/Smoke Section */}
                          <View style={styles.thresholdSection}>
                            <View style={styles.thresholdSectionHeader}>
                              <Fan size={20} color={colors.primary} />
                              <Text style={styles.thresholdSectionTitle}>Gas/Smoke</Text>
                            </View>
                            <View style={styles.thresholdMinMaxRow}>
                              <View style={[styles.thresholdMinMaxGroup, { flex: 1 }]}>
                                <Text style={styles.thresholdMinMaxLabel}>Max Threshold</Text>
                                <TextInput
                                  style={styles.thresholdInput}
                                  value={editingThresholds.mq2High}
                                  onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, mq2High: text }))}
                                  keyboardType="numeric"
                                  placeholder="60"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                              </View>
                            </View>
                          </View>
                        </ScrollView>

                        {/* Save Button */}
                        <TouchableOpacity
                          style={[styles.saveThresholdsButton, savingThresholds && styles.saveThresholdsButtonDisabled]}
                          onPress={saveThresholds}
                          disabled={savingThresholds}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.neonCyan]}
                            style={styles.saveThresholdsGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Check size={18} color="#fff" />
                            <Text style={styles.saveThresholdsText}>
                              {savingThresholds ? 'Sending...' : 'Save & Sync to Device'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </LinearGradient>
                    </View>
                  </View>
                </Modal>
              </>
            ) : isClimateDevice ? (
              <View style={styles.climateControl}>
                {/* Circular Dial */}
                <View style={styles.dialContainer}>
                  <View style={styles.dialOuter}>
                    <LinearGradient
                      colors={localMode === 'heat' ? ['#FF6B6B', '#FF8E53'] : ['#00C2FF', '#00FFF0']}
                      style={styles.dialProgress}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.dialInner}>
                      <Text style={styles.dialValue}>{Math.round(localValue)}</Text>
                      <Text style={styles.dialUnit}>°C</Text>
                    </View>
                  </View>

                  {/* Temperature controls */}
                  <View style={styles.tempControls}>
                    <TouchableOpacity
                      style={styles.tempButton}
                      onPress={() => {
                        const newVal = Math.max(min, localValue - 1);
                        setLocalValue(newVal);
                        onSetValue(device.id, newVal);
                      }}
                    >
                      <Text style={styles.tempButtonText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tempButton}
                      onPress={() => {
                        const newVal = Math.min(max, localValue + 1);
                        setLocalValue(newVal);
                        onSetValue(device.id, newVal);
                      }}
                    >
                      <Text style={styles.tempButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mode Selector */}
                <View style={styles.modeRow}>
                  {[
                    { key: 'cool', label: 'Cooling', icon: Snowflake },
                    { key: 'heat', label: 'Heat', icon: Flame },
                    { key: 'auto', label: 'Auto', icon: RotateCcw },
                  ].map((modeItem) => (
                    <TouchableOpacity
                      key={modeItem.key}
                      style={[
                        styles.modeButton,
                        localMode === modeItem.key && styles.modeButtonActive,
                      ]}
                      onPress={() => handleModeChange(modeItem.key)}
                    >
                      <modeItem.icon
                        size={18}
                        color={localMode === modeItem.key ? colors.primary : colors.mutedForeground}
                      />
                      <Text style={[
                        styles.modeLabel,
                        localMode === modeItem.key && styles.modeLabelActive,
                      ]}>
                        {modeItem.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.quickAction}>
                    <Fan size={18} color={colors.mutedForeground} />
                    <Text style={styles.quickActionLabel}>Fan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickAction}>
                    <Clock size={18} color={colors.mutedForeground} />
                    <Text style={styles.quickActionLabel}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.dimmerControl}>
                {/* Large Value Display */}
                <View style={styles.valueDisplay}>
                  <Text style={styles.largeValue}>{getValueLabel()}</Text>
                  <Text style={styles.valueSubtitle}>
                    {isDimmable ? 'Brightness' : isFan ? 'Speed' : isBlinds ? 'Position' : 'Level'}
                  </Text>
                </View>

                {/* Slider */}
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    style={styles.sliderTrackTouch}
                    activeOpacity={0.9}
                    onPress={(e) => {
                      const { locationX } = e.nativeEvent;
                      const sliderWidth = SCREEN_WIDTH - 80; // Account for padding
                      const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
                      const newValue = Math.round(min + percentage * (max - min));
                      setLocalValue(newValue);
                      onSetValue(device.id, newValue);
                    }}
                  >
                    <View style={styles.sliderTrack}>
                      <LinearGradient
                        colors={[colors.primary, colors.neonCyan]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.sliderFill,
                          { width: `${((localValue - min) / (max - min)) * 100}%` },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        styles.sliderThumb,
                        { left: `${((localValue - min) / (max - min)) * 100}%` },
                      ]}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.neonCyan]}
                        style={styles.sliderThumbInner}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Value adjustment buttons */}
                  <View style={styles.sliderButtons}>
                    <TouchableOpacity
                      style={styles.sliderBtn}
                      onPress={() => {
                        const newVal = Math.max(min, localValue - 10);
                        setLocalValue(newVal);
                        onSetValue(device.id, newVal);
                      }}
                    >
                      <Text style={styles.sliderBtnText}>−10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sliderBtn}
                      onPress={() => {
                        const newVal = Math.min(max, localValue + 10);
                        setLocalValue(newVal);
                        onSetValue(device.id, newVal);
                      }}
                    >
                      <Text style={styles.sliderBtnText}>+10</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Presets */}
                {isDimmable && (
                  <View style={styles.presets}>
                    {[
                      { value: 0, icon: Moon, label: 'Off' },
                      { value: 25, icon: Sun, label: '25%' },
                      { value: 50, icon: Sun, label: '50%' },
                      { value: 75, icon: Sun, label: '75%' },
                      { value: 100, icon: Sun, label: '100%' },
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset.value}
                        style={[
                          styles.presetButton,
                          Math.round(localValue) === preset.value && styles.presetButtonActive,
                        ]}
                        onPress={() => {
                          setLocalValue(preset.value);
                          onSetValue(device.id, preset.value);
                        }}
                      >
                        <preset.icon
                          size={16}
                          color={Math.round(localValue) === preset.value ? colors.primary : colors.mutedForeground}
                        />
                        <Text style={[
                          styles.presetLabel,
                          Math.round(localValue) === preset.value && styles.presetLabelActive,
                        ]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Power Button - Not for airguard devices */}
            {!isAirguard && (
              <TouchableOpacity
                style={[styles.powerButton, isActive && styles.powerButtonActive]}
                onPress={handleToggle}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isActive ? [colors.primary, colors.neonPurple] : [colors.muted, colors.muted]}
                  style={styles.powerButtonGradient}
                >
                  <Power size={24} color={isActive ? '#fff' : colors.mutedForeground} />
                  <Text style={[styles.powerLabel, isActive && styles.powerLabelActive]}>
                    {isActive ? 'Turn Off' : 'Turn On'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Vealive-styled Confirmation Popup */}
      <Modal
        visible={confirmPopup.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPopup(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirmPopup(prev => ({ ...prev, visible: false }))}
            activeOpacity={1}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
          </TouchableOpacity>

          <View style={styles.confirmContent}>
            <LinearGradient
              colors={[colors.card, colors.cardAlt]}
              style={styles.confirmCard}
            >
              {/* Icon */}
              <View style={[
                styles.confirmIconContainer,
                confirmPopup.type === 'success' && styles.confirmIconSuccess,
                confirmPopup.type === 'warning' && styles.confirmIconWarning,
                confirmPopup.type === 'error' && styles.confirmIconError,
              ]}>
                {confirmPopup.type === 'success' && <Check size={32} color="#fff" />}
                {confirmPopup.type === 'warning' && <AlertTriangle size={32} color="#fff" />}
                {confirmPopup.type === 'error' && <X size={32} color="#fff" />}
              </View>

              {/* Title */}
              <Text style={styles.confirmTitle}>{confirmPopup.title}</Text>

              {/* Message */}
              <Text style={styles.confirmMessage}>{confirmPopup.message}</Text>

              {/* OK Button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setConfirmPopup(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    confirmPopup.type === 'success' ? ['#4CAF50', '#2E7D32'] :
                      confirmPopup.type === 'warning' ? ['#FFB300', '#FF8F00'] :
                        ['#FF6B6B', '#FF5252']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditName(false)}
      >
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowEditName(false)}
            activeOpacity={1}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
          </TouchableOpacity>

          <View style={styles.editNameCard}>
            <LinearGradient
              colors={[colors.card, colors.cardAlt]}
              style={styles.editNameContent}
            >
              {/* Header */}
              <View style={styles.editNameHeader}>
                <View style={styles.editNameTitleContainer}>
                  <View style={styles.editNameIconWrapper}>
                    <LinearGradient
                      colors={[colors.primary, colors.neonCyan]}
                      style={styles.editNameIconGradient}
                    >
                      <Edit2 size={18} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text style={styles.editNameTitle}>Edit Device Name</Text>
                    <Text style={styles.editNameSubtitle}>Choose a unique name</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEditName(false)}
                  style={styles.editNameClose}
                >
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Input Field */}
              <View style={styles.nameInputWrapper}>
                <TextInput
                  style={styles.nameInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="e.g., Living Room Monitor"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  selectionColor={colors.primary}
                />
                <View style={styles.nameInputIcon}>
                  <Sparkles size={16} color={colors.mutedForeground} />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.editNameActions}>
                <TouchableOpacity
                  style={[styles.editNameButton, styles.editNameButtonCancel]}
                  onPress={() => setShowEditName(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editNameButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editNameButton, styles.editNameButtonSave]}
                  onPress={async () => {
                    if (!device || !editingName.trim()) return;
                    setSavingName(true);
                    try {
                      if (onUpdateName) {
                        await onUpdateName(device.id, editingName.trim());
                        setDisplayName(editingName.trim()); // Update local display immediately
                      }
                      setShowEditName(false);
                    } catch (error) {
                      console.error('Failed to update name:', error);
                    } finally {
                      setSavingName(false);
                    }
                  }}
                  disabled={savingName || !editingName.trim()}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={savingName || !editingName.trim()
                      ? [colors.muted, colors.muted]
                      : [colors.primary, colors.neonCyan]}
                    style={styles.editNameButtonGradient}
                  >
                    {savingName ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Check size={16} color="#fff" />
                        <Text style={styles.editNameButtonSaveText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Room Picker Modal - Redesigned */}
      <Modal
        visible={showRoomPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoomPicker(false)}
      >
        <View style={styles.roomPickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRoomPicker(false)}
            activeOpacity={1}
          />

          <View style={styles.roomPickerContainer}>
            <LinearGradient
              colors={[colors.card, colors.cardAlt]}
              style={styles.roomPickerGradient}
            >
              {/* Handle Bar */}
              <View style={styles.roomPickerHandle} />

              {/* Header */}
              <View style={styles.roomPickerHeaderNew}>
                <View style={styles.roomPickerIconWrapperNew}>
                  <LinearGradient
                    colors={[colors.primary, colors.neonCyan]}
                    style={styles.roomPickerIconGradientNew}
                  >
                    <Home size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomPickerTitleNew}>Select Room</Text>
                  <Text style={styles.roomPickerSubtitleNew}>
                    {device?.name || 'Device'} • {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} available
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowRoomPicker(false)}
                  style={styles.roomPickerCloseNew}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Room Grid */}
              <ScrollView
                style={styles.roomPickerScrollNew}
                contentContainerStyle={styles.roomPickerContentNew}
                showsVerticalScrollIndicator={false}
              >
                {/* Remove Option */}
                {displayRoomId && (
                  <TouchableOpacity
                    style={styles.roomCardRemove}
                    onPress={async () => {
                      if (!device || !onUpdateRoom) return;
                      try {
                        console.log('[DeviceControlModal] Unassigning device', device.id, 'from room');
                        await onUpdateRoom(device.id, null);
                        console.log('[DeviceControlModal] Room unassignment successful');
                        setDisplayRoomId(null); // Update local display immediately
                        setShowRoomPicker(false);
                      } catch (error: any) {
                        console.error('[DeviceControlModal] Failed to remove from room:', error);
                        console.error('[DeviceControlModal] Error details:', error?.response?.data || error?.message);
                        Alert.alert('Error', error?.response?.data?.error || error?.message || 'Failed to unassign room');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.roomCardRemoveIcon}>
                      <X size={24} color={colors.destructive} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.roomCardRemoveTitle}>No Room</Text>
                    <Text style={styles.roomCardRemoveSubtitle}>Unassign device</Text>
                  </TouchableOpacity>
                )}

                {/* Room Cards */}
                {rooms.length === 0 ? (
                  <View style={styles.roomPickerEmptyNew}>
                    <View style={styles.roomPickerEmptyIcon}>
                      <MapPin size={48} color={colors.mutedForeground} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.roomPickerEmptyTitle}>No Rooms Yet</Text>
                    <Text style={styles.roomPickerEmptySubtitle}>
                      Create a room in settings to organize your devices
                    </Text>
                  </View>
                ) : (
                  rooms.map((room) => {
                    if (!room || !room.id) return null;
                    const isActive = displayRoomId === room.id;
                    return (
                      <TouchableOpacity
                        key={room.id}
                        style={[
                          styles.roomCard,
                          isActive && styles.roomCardActive
                        ]}
                        onPress={async () => {
                          console.log('[DeviceControlModal] Room card pressed:', { deviceId: device?.id, roomId: room.id, hasDevice: !!device, hasOnUpdateRoom: !!onUpdateRoom });
                          if (!device || !onUpdateRoom) {
                            console.warn('[DeviceControlModal] Cannot assign room - missing device or onUpdateRoom callback');
                            return;
                          }
                          try {
                            console.log('[DeviceControlModal] Starting room assignment - device:', device.id, 'to room:', room.id);
                            await onUpdateRoom(device.id, room.id);
                            console.log('[DeviceControlModal] Room assignment callback completed successfully');
                            setDisplayRoomId(room.id); // Update local display immediately
                            setShowRoomPicker(false);
                            console.log('[DeviceControlModal] Local state updated and picker closed');
                          } catch (error: any) {
                            console.error('[DeviceControlModal] Failed to assign room:', error);
                            console.error('[DeviceControlModal] Error details:', error?.response?.data || error?.message);
                            console.error('[DeviceControlModal] Error stack:', error?.stack);
                            // Show error to user
                            Alert.alert('Error', error?.response?.data?.error || error?.message || 'Failed to assign room');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        {isActive && (
                          <View style={styles.roomCardCheckBadge}>
                            <LinearGradient
                              colors={[colors.primary, colors.neonCyan]}
                              style={styles.roomCardCheckGradient}
                            >
                              <Check size={16} color="#fff" strokeWidth={3} />
                            </LinearGradient>
                          </View>
                        )}
                        <View style={[
                          styles.roomCardIconContainer,
                          isActive && styles.roomCardIconContainerActive
                        ]}>
                          <Home
                            size={28}
                            color={isActive ? '#fff' : colors.primary}
                            strokeWidth={2}
                          />
                        </View>
                        <Text style={[
                          styles.roomCardTitle,
                          isActive && styles.roomCardTitleActive
                        ]} numberOfLines={1}>
                          {room.name || 'Unnamed Room'}
                        </Text>
                        {isActive && (
                          <View style={styles.roomCardActiveBadge}>
                            <Sparkles size={12} color={colors.primary} />
                            <Text style={styles.roomCardActiveBadgeText}>Active</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }).filter(Boolean)
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Reprovision Modal */}
      <Modal
        visible={showReprovisionModal}
        transparent
        animationType="fade"
        onRequestClose={() => !reprovisioning && setShowReprovisionModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => !reprovisioning && setShowReprovisionModal(false)}
            activeOpacity={1}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
          </TouchableOpacity>

          <View style={styles.reprovisionModalContent}>
            <LinearGradient
              colors={[colors.card, colors.cardAlt]}
              style={styles.reprovisionModalInner}
            >
              {/* Header */}
              <View style={styles.reprovisionModalHeader}>
                <View style={styles.reprovisionIconWrapper}>
                  <LinearGradient
                    colors={[colors.primary, colors.neonCyan]}
                    style={styles.reprovisionIconGradient}
                  >
                    <RefreshCw size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reprovisionModalTitle}>Reprovision Device</Text>
                  <Text style={styles.reprovisionModalSubtitle}>
                    Resend WiFi credentials via Bluetooth
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => !reprovisioning && setShowReprovisionModal(false)}
                  style={styles.reprovisionModalClose}
                  disabled={reprovisioning}
                >
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Instructions */}
              <View style={styles.reprovisionInstructions}>
                <Text style={styles.reprovisionInstructionsText}>
                  1. Make sure the device is nearby and in pairing mode{'\n'}
                  2. Enter your WiFi network credentials{'\n'}
                  3. The device will reconnect to WiFi automatically
                </Text>
              </View>

              {/* WiFi SSID Input */}
              <View style={styles.reprovisionInputGroup}>
                <Text style={styles.reprovisionLabel}>WiFi Network (SSID)</Text>
                <View style={styles.reprovisionInputWrapper}>
                  <Wifi size={20} color={colors.mutedForeground} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={styles.reprovisionInput}
                    value={reprovisionSSID}
                    onChangeText={setReprovisionSSID}
                    placeholder="Enter WiFi network name"
                    placeholderTextColor={colors.mutedForeground}
                    editable={!reprovisioning}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* WiFi Password Input */}
              <View style={styles.reprovisionInputGroup}>
                <Text style={styles.reprovisionLabel}>WiFi Password</Text>
                <View style={styles.reprovisionInputWrapper}>
                  <Lock size={20} color={colors.mutedForeground} style={{ marginRight: spacing.sm }} />
                  <TextInput
                    style={styles.reprovisionInput}
                    value={reprovisionPassword}
                    onChangeText={setReprovisionPassword}
                    placeholder="Enter WiFi password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    editable={!reprovisioning}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.reprovisionActions}>
                <TouchableOpacity
                  style={[styles.reprovisionButtonCancel, reprovisioning && styles.reprovisionButtonDisabled]}
                  onPress={() => setShowReprovisionModal(false)}
                  disabled={reprovisioning}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reprovisionButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reprovisionButtonSave, reprovisioning && styles.reprovisionButtonDisabled]}
                  onPress={async () => {
                    if (!reprovisionSSID.trim()) {
                      Alert.alert('Error', 'Please enter a WiFi network name');
                      return;
                    }
                    if (!reprovisionPassword.trim()) {
                      Alert.alert('Error', 'Please enter a WiFi password');
                      return;
                    }

                    setReprovisioning(true);
                    try {
                      const result = await reprovisionDevice({
                        ssid: reprovisionSSID.trim(),
                        password: reprovisionPassword.trim(),
                        deviceName: device.name,
                        timeout: 15000,
                      });

                      if (result.success) {
                        setConfirmPopup({
                          visible: true,
                          type: 'success',
                          title: 'Reprovisioning Successful',
                          message: result.message,
                        });
                        setShowReprovisionModal(false);
                        setReprovisionPassword(''); // Clear password for security
                      } else {
                        setConfirmPopup({
                          visible: true,
                          type: 'error',
                          title: 'Reprovisioning Failed',
                          message: result.error || result.message,
                        });
                      }
                    } catch (error: any) {
                      console.error('[DeviceControlModal] Reprovision error:', error);
                      setConfirmPopup({
                        visible: true,
                        type: 'error',
                        title: 'Reprovisioning Failed',
                        message: error.message || 'An unexpected error occurred',
                      });
                    } finally {
                      setReprovisioning(false);
                    }
                  }}
                  disabled={reprovisioning || !reprovisionSSID.trim() || !reprovisionPassword.trim()}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      reprovisioning || !reprovisionSSID.trim() || !reprovisionPassword.trim()
                        ? [colors.muted, colors.muted]
                        : [colors.primary, colors.neonCyan]
                    }
                    style={styles.reprovisionButtonGradient}
                  >
                    {reprovisioning ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RefreshCw size={16} color="#fff" />
                        <Text style={styles.reprovisionButtonSaveText}>Reprovision</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Attach Device Modal */}
      <Modal
        visible={showAttachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAttachModal(false)}
            activeOpacity={1}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
          </TouchableOpacity>

          <View style={styles.confirmContent}>
            <LinearGradient
              colors={[colors.card, colors.cardAlt]}
              style={styles.confirmCard}
            >
              {/* Icon */}
              <View style={[styles.confirmIconContainer, { backgroundColor: colors.primary }]}>
                <Plus size={32} color="#fff" />
              </View>

              {/* Title */}
              <Text style={styles.confirmTitle}>Attach Device</Text>

              {/* Message */}
              <Text style={styles.confirmMessage}>
                Select the type of device you want to attach to this AirGuard hub.
              </Text>

              {/* Device Type Buttons */}
              <View style={{ gap: spacing.sm, marginTop: spacing.md, width: '100%' }}>
                <TouchableOpacity
                  style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
                  onPress={() => {
                    setShowAttachModal(false);
                    // TODO: Navigate to IR device attach flow
                    console.log('Attach IR device to:', device?.id);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.neonCyan]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>IR Device</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
                  onPress={() => {
                    setShowAttachModal(false);
                    // TODO: Navigate to RF device attach flow
                    console.log('Attach RF device to:', device?.id);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.neonCyan]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>RF Device</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ borderRadius: borderRadius.lg, overflow: 'hidden', marginTop: spacing.xs }}
                  onPress={() => setShowAttachModal(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.muted, colors.muted]}
                    style={[styles.confirmButtonGradient, { paddingVertical: spacing.md }]}
                  >
                    <Text style={[styles.confirmButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </Modal >
  );
}

const createStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdropTouch: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingTop: 50, // Leave space for status bar
    },
    modal: {
      flex: 1,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      minHeight: 300, // Ensure modal has minimum height
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainerActive: {
      backgroundColor: colors.primary,
    },
    deviceName: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
    },
    deviceRoom: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    deviceNoRoom: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
    offlineOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      gap: spacing.md,
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
    },
    offlineTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    offlineMessage: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reprovisionButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    trashButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#FF6B6B',
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    alertBannerText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: '#fff',
    },
    climateControl: {
      alignItems: 'center',
      gap: spacing.xl,
    },
    dialContainer: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    dialOuter: {
      width: DIAL_SIZE,
      height: DIAL_SIZE,
      borderRadius: DIAL_SIZE / 2,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: DIAL_STROKE,
      borderColor: colors.border,
    },
    dialProgress: {
      position: 'absolute',
      width: DIAL_SIZE,
      height: DIAL_SIZE,
      borderRadius: DIAL_SIZE / 2,
      opacity: 0.3,
    },
    dialInner: {
      width: DIAL_SIZE - DIAL_STROKE * 4,
      height: DIAL_SIZE - DIAL_STROKE * 4,
      borderRadius: (DIAL_SIZE - DIAL_STROKE * 4) / 2,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    dialValue: {
      fontSize: 56,
      fontWeight: '700',
      color: colors.foreground,
    },
    dialUnit: {
      fontSize: fontSize.lg,
      color: colors.mutedForeground,
      marginTop: -spacing.xs,
    },
    tempControls: {
      flexDirection: 'row',
      gap: spacing.xl,
    },
    tempButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tempButtonText: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.foreground,
    },
    modeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    },
    modeButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeButtonActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary + '60',
    },
    modeLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    modeLabelActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    quickAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionLabel: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    dimmerControl: {
      alignItems: 'center',
      gap: spacing.xl,
      paddingVertical: spacing.lg,
    },
    valueDisplay: {
      alignItems: 'center',
    },
    largeValue: {
      fontSize: 64,
      fontWeight: '700',
      color: colors.foreground,
    },
    valueSubtitle: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
    },
    sliderContainer: {
      width: '100%',
      gap: spacing.md,
    },
    sliderTrackTouch: {
      width: '100%',
      height: 48,
      justifyContent: 'center',
      position: 'relative',
    },
    sliderTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    sliderFill: {
      height: '100%',
      borderRadius: 4,
    },
    sliderThumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      marginLeft: -12,
      marginTop: -8,
      top: '50%',
    },
    sliderThumbInner: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    sliderButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sliderBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sliderBtnText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.foreground,
    },
    slider: {
      width: '100%',
      height: 48,
    },
    presets: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    presetButton: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 60,
    },
    presetButtonActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary + '60',
    },
    presetLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    presetLabelActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    powerButton: {
      marginTop: spacing.lg,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    powerButtonActive: {
      ...shadows.neonPrimary,
    },
    powerButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    powerLabel: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    powerLabelActive: {
      color: '#fff',
    },

    airguardControl: {
      flex: 1,
    },
    airguardControlContent: {
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    connectionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.md,
    },
    connectionStatusText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    signalStrengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.md,
    },
    signalBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      height: 16,
    },
    signalBar: {
      width: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
    },
    signalText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
    },
    airguardMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    airguardMetricCard: {
      width: '48%',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      ...shadows.md,
    },
    metricIconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(77, 123, 254, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertMetricCard: {
      borderColor: '#FF6B6B',
      borderWidth: 2,
    },
    airguardMetricValue: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    airguardMetricLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.5)',
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    muteButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    muteButtonActive: {
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 8,
    },
    muteButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    muteLabel: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    muteLabelActive: {
      color: '#fff',
    },

    thresholdToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thresholdToggleText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    // Threshold popup modal styles
    thresholdModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    thresholdModalContent: {
      width: '100%',
      maxWidth: 400,
      maxHeight: SCREEN_HEIGHT * 0.8,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    thresholdModalInner: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    thresholdModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    thresholdModalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    thresholdModalClose: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md,
      backgroundColor: colors.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    thresholdModalSubtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: -spacing.xs,
    },
    thresholdScrollView: {
      maxHeight: SCREEN_HEIGHT * 0.45,
    },
    thresholdSection: {
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thresholdSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    thresholdSectionTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
    },
    thresholdMinMaxRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    thresholdMinMaxGroup: {
      flex: 1,
      gap: spacing.xs,
    },
    thresholdMinMaxLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    thresholdPanel: {
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thresholdPanelTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
    },
    thresholdPanelSubtitle: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: -spacing.xs,
    },
    thresholdRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    thresholdInputGroup: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    thresholdLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    thresholdInput: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.md,
      color: colors.foreground,
      textAlign: 'center',
    },
    saveThresholdsButton: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    saveThresholdsButtonDisabled: {
      opacity: 0.6,
    },
    saveThresholdsGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    saveThresholdsText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: '#fff',
    },

    deleteButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    deleteButtonGradient: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    deleteButtonText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },

    // Vealive-styled confirmation popup
    confirmOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmContent: {
      width: SCREEN_WIDTH - 64,
      maxWidth: 340,
    },
    confirmCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows?.lg,
    },
    confirmIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    confirmIconSuccess: {
      backgroundColor: '#4CAF50',
    },
    confirmIconWarning: {
      backgroundColor: '#FFB300',
    },
    confirmIconError: {
      backgroundColor: '#FF6B6B',
    },
    confirmTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    confirmMessage: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.lg,
    },
    confirmButton: {
      width: '100%',
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    confirmButtonGradient: {
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmButtonText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },
    airguardScrollView: {
      flex: 1,
    },
    airguardScrollContent: {
      padding: 16,
    },
    statusBadgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusOnline: {
      backgroundColor: 'rgba(0, 229, 160, 0.15)',
    },
    statusOffline: {
      backgroundColor: 'rgba(107, 114, 128, 0.15)',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    dotOnline: {
      backgroundColor: '#00E5A0',
    },
    dotOffline: {
      backgroundColor: '#6B7280',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    statusTextOnline: {
      color: '#00E5A0',
    },
    statusTextOffline: {
      color: '#6B7280',
    },
    editIconButton: {
      padding: 4,
      borderRadius: 4,
    },
    editNameCard: {
      marginHorizontal: spacing.lg,
      marginVertical: 'auto',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      maxWidth: 500,
      width: '100%',
      alignSelf: 'center',
      ...shadows.xl,
    },
    editNameContent: {
      padding: spacing.xl,
    },
    editNameHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    editNameTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    editNameIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    editNameIconGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editNameTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
    },
    editNameSubtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    editNameClose: {
      padding: spacing.xs,
      marginTop: -4,
    },
    nameInputWrapper: {
      position: 'relative',
      marginBottom: spacing.lg,
    },
    nameInput: {
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      paddingRight: spacing.xl * 2,
      fontSize: fontSize.md,
      color: colors.foreground,
      borderWidth: 1.5,
      borderColor: colors.border,
      fontWeight: '500',
    },
    nameInputIcon: {
      position: 'absolute',
      right: spacing.md,
      top: '50%',
      transform: [{ translateY: -8 }],
    },
    editNameActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    editNameButton: {
      flex: 1,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    editNameButtonCancel: {
      backgroundColor: colors.muted,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    editNameButtonCancelText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    editNameButtonSave: {
      flex: 1.5,
    },
    editNameButtonGradient: {
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    editNameButtonSaveText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },
    // New Room Picker Styles - Bottom Sheet Design
    roomPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'flex-end',
    },
    roomPickerContainer: {
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      overflow: 'hidden',
      maxHeight: '85%',
      ...shadows.xl,
    },
    roomPickerGradient: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    roomPickerHandle: {
      width: 40,
      height: 5,
      borderRadius: borderRadius.full,
      backgroundColor: colors.muted,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    roomPickerHeaderNew: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    roomPickerIconWrapperNew: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    roomPickerIconGradientNew: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomPickerTitleNew: {
      fontSize: fontSize.xl,
      fontWeight: '800',
      color: colors.foreground,
      marginBottom: 4,
    },
    roomPickerSubtitleNew: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      fontWeight: '500',
    },
    roomPickerCloseNew: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomPickerScrollNew: {
      maxHeight: 500,
    },
    roomPickerContentNew: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    // Room Cards - Grid Style
    roomCard: {
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      paddingVertical: spacing.sm + 4,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
      ...shadows.sm,
    },
    roomCardActive: {
      backgroundColor: colors.primary + '15',
      borderColor: colors.primary,
      ...shadows.lg,
    },
    roomCardCheckBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 28,
      height: 28,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      ...shadows.md,
    },
    roomCardCheckGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomCardIconContainer: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    roomCardIconContainerActive: {
      backgroundColor: colors.primary,
    },
    roomCardTitle: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    roomCardTitleActive: {
      color: colors.primary,
    },
    roomCardActiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary + '20',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    roomCardActiveBadgeText: {
      fontSize: fontSize.xs,
      color: colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    // Remove Card
    roomCardRemove: {
      backgroundColor: colors.destructive + '15',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.destructive + '40',
      ...shadows.md,
    },
    roomCardRemoveIcon: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.xxl,
      backgroundColor: colors.destructive + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    roomCardRemoveTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.destructive,
      marginBottom: spacing.xs,
    },
    roomCardRemoveSubtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    // Empty State
    roomPickerEmptyNew: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 3,
      gap: spacing.md,
    },
    roomPickerEmptyIcon: {
      width: 96,
      height: 96,
      borderRadius: borderRadius.xxl,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    roomPickerEmptyTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    roomPickerEmptySubtitle: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
      lineHeight: 22,
    },
    // Reprovision Modal Styles
    reprovisionModalContent: {
      marginHorizontal: spacing.lg,
      marginVertical: 'auto',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      maxWidth: 500,
      width: '100%',
      alignSelf: 'center',
      ...shadows.xl,
    },
    reprovisionModalInner: {
      padding: spacing.xl,
    },
    reprovisionModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    reprovisionIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    reprovisionIconGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reprovisionModalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    reprovisionModalSubtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    reprovisionModalClose: {
      padding: spacing.xs,
      marginTop: -4,
    },
    reprovisionInstructions: {
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reprovisionInstructionsText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    reprovisionInputGroup: {
      marginBottom: spacing.md,
    },
    reprovisionLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    reprovisionInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reprovisionInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    reprovisionActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    reprovisionButtonCancel: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    reprovisionButtonCancelText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    reprovisionButtonSave: {
      flex: 1.5,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    reprovisionButtonDisabled: {
      opacity: 0.5,
    },
    reprovisionButtonGradient: {
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    reprovisionButtonSaveText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },
  });
