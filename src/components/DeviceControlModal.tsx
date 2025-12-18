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
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { Device } from '../types';
import { getApiClient, PublicAirguardApi } from '../services/api';
import AirguardAlertBanner, { getAlertInfo, decodeAlertFlags } from './AirguardAlertBanner';

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
}: DeviceControlModalProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  
  const [localValue, setLocalValue] = useState(device?.value ?? 0);
  const [localMode, setLocalMode] = useState<string>('manual');
  const [isActive, setIsActive] = useState(device?.isActive ?? false);
  
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
    // Check signalMappings first (this is where device onboarding stores it)
    const fromSignalMappings = (device.signalMappings as any)?.smartMonitorId ?? 
                               (device.signalMappings as any)?.smartmonitorId;
    if (fromSignalMappings) return fromSignalMappings;
    // Fallback to metadata
    const fromMetadata = device.metadata?.smartMonitorId;
    if (fromMetadata) return fromMetadata;
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
      
      // Backend response has TRIPLE nesting: { success: true, data: { data: { data: {...} } } }
      // This is because successResponse wraps it, then controller wraps it again
      const latestWrapper = latestRes.data?.data;
      const statusWrapper = statusRes.data?.data;
      
      // Extract actual data from the inner wrapper
      const latest = latestWrapper?.data || latestWrapper;
      const status = statusWrapper?.data || statusWrapper;
      
      console.log('[Airguard] Raw response:', { latestWrapper, statusWrapper });
      console.log('[Airguard] Extracted data:', { latest, status });
      
      if (!latest) {
        console.error('[Airguard] No data in response:', latestRes.data);
        setLiveAirguardData(null);
        return;
      }
      
      // Map backend fields - backend returns temperature/humidity (not temp/hum)
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
      
      console.log('[Airguard] Mapped data:', newData);
      console.log('[Airguard] AlertFlags value:', newData.alertFlags, 'Type:', typeof newData.alertFlags);
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
      const data = res.data?.data;
      if (data) {
        const newThresholds = {
          tempHigh: data.tempMax ?? data.tempHigh ?? 35,
          tempLow: data.tempMin ?? data.tempLow ?? 10,
          humidityHigh: data.humMax ?? data.humidityHigh ?? 80,
          humidityLow: data.humMin ?? data.humidityLow ?? 20,
          dustHigh: data.dustHigh ?? data.dust ?? 400,
          mq2High: data.mq2High ?? data.mq2 ?? 60,
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
      }
    } catch (error) {
      console.warn('Failed to fetch thresholds:', error);
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
      setIsActive(device.isActive ?? false);
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
                  <Text style={styles.deviceName}>{device.name}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {isAirguard && onDelete && (
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
              <View style={styles.airguardControl}>
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
                  alertFlags={liveAirguardData?.alertFlags ?? 0}
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
                        <View style={[styles.airguardMetricCard, tempAlert && styles.alertMetricCard]}>
                          <Thermometer size={24} color={tempAlert ? '#FF6B6B' : colors.primary} />
                          <Text style={[styles.airguardMetricValue, tempAlert && { color: '#FF6B6B' }]}>
                            {temp != null ? `${Number(temp).toFixed(1)}°C` : '--'}
                          </Text>
                          <Text style={styles.airguardMetricLabel}>Temp</Text>
                        </View>

                        <View style={[styles.airguardMetricCard, humAlert && styles.alertMetricCard]}>
                          <Droplets size={24} color={humAlert ? '#FF6B6B' : colors.primary} />
                          <Text style={[styles.airguardMetricValue, humAlert && { color: '#FF6B6B' }]}>
                            {hum != null ? `${Math.round(hum)}%` : '--'}
                          </Text>
                          <Text style={styles.airguardMetricLabel}>Humidity</Text>
                        </View>

                        <View style={[styles.airguardMetricCard, dustAlert && styles.alertMetricCard]}>
                          <Wind size={24} color={dustAlert ? '#FF6B6B' : colors.primary} />
                          <Text style={[styles.airguardMetricValue, dustAlert && { color: '#FF6B6B' }]}>
                            {dust != null ? `${dust}` : '--'}
                          </Text>
                          <Text style={styles.airguardMetricLabel}>Dust</Text>
                        </View>

                        <View style={[styles.airguardMetricCard, mq2Alert && styles.alertMetricCard]}>
                          <Fan size={24} color={mq2Alert ? '#FF6B6B' : colors.primary} />
                          <Text style={[styles.airguardMetricValue, mq2Alert && { color: '#FF6B6B' }]}>
                            {mq2 != null ? `${mq2}` : '--'}
                          </Text>
                          <Text style={styles.airguardMetricLabel}>Gas/Smoke</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.muteButton, isMuted && styles.muteButtonActive]}
                        onPress={() => {
                          // If currently muted, we want to unmute (pass false to wantMuted)
                          // If currently unmuted, we want to mute (pass true to wantMuted)
                          handleMuteToggle(!isMuted);
                        }}
                        disabled={togglingMute}
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
                        style={styles.thresholdToggle}
                        onPress={() => setShowThresholdSettings(true)}
                        activeOpacity={0.8}
                      >
                        <Settings size={18} color={colors.mutedForeground} />
                        <Text style={styles.thresholdToggleText}>
                          Threshold Settings
                        </Text>
                      </TouchableOpacity>

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
                  );
                })()}
              </View>
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

            {/* Power Button */}
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
    </Modal>
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
      maxHeight: SCREEN_HEIGHT * 0.85,
    },
    modal: {
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
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
      gap: spacing.lg,
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
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    alertMetricCard: {
      borderColor: '#FF6B6B',
      borderWidth: 2,
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
    },
    airguardMetricValue: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    airguardMetricLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      textAlign: 'center',
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
  });
