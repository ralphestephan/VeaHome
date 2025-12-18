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
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { Device } from '../types';
import { getApiClient, PublicAirguardApi } from '../services/api';

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
  } | null>(null);
  
  // Threshold state for Airguard
  const [thresholds, setThresholds] = useState({
    tempHigh: 35,
    humidityHigh: 80,
    dustHigh: 400,
    mq2High: 60,
  });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState({
    tempHigh: '35',
    humidityHigh: '80',
    dustHigh: '400',
    mq2High: '60',
  });
  const [savingThresholds, setSavingThresholds] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  
  // Memoize API client
  const airguardApi = useMemo(() => PublicAirguardApi(getApiClient()), []);

  // Fetch latest airguard data
  const fetchAirguardData = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;
    
    const smartMonitorId = device.metadata?.smartMonitorId;
    if (!smartMonitorId) return;
    
    try {
      const [latestRes, statusRes] = await Promise.all([
        airguardApi.getLatest(smartMonitorId),
        airguardApi.getStatus(smartMonitorId),
      ]);
      
      const latest = latestRes.data;
      const status = statusRes.data;
      
      setLiveAirguardData({
        temperature: latest.temperature,
        humidity: latest.humidity,
        dust: latest.dust,
        mq2: latest.mq2,
        buzzer: latest.buzzer === 1 || latest.buzzer === true,
        isOnline: status.online,
      });
    } catch (error) {
      console.warn('Failed to fetch airguard data:', error);
    }
  }, [device, airguardApi]);

  // Fetch thresholds when modal opens
  const fetchThresholds = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;
    
    const smartMonitorId = device.metadata?.smartMonitorId;
    if (!smartMonitorId) return;
    
    try {
      const res = await airguardApi.getThresholds(smartMonitorId);
      const data = res.data?.data;
      if (data) {
        const newThresholds = {
          tempHigh: data.tempHigh ?? 35,
          humidityHigh: data.humidityHigh ?? 80,
          dustHigh: data.dustHigh ?? 400,
          mq2High: data.mq2High ?? 60,
        };
        setThresholds(newThresholds);
        setEditingThresholds({
          tempHigh: String(newThresholds.tempHigh),
          humidityHigh: String(newThresholds.humidityHigh),
          dustHigh: String(newThresholds.dustHigh),
          mq2High: String(newThresholds.mq2High),
        });
      }
    } catch (error) {
      console.warn('Failed to fetch thresholds:', error);
    }
  }, [device, airguardApi]);

  // Save thresholds to device via MQTT
  const saveThresholds = useCallback(async () => {
    if (!device || device.type !== 'airguard') return;
    
    const smartMonitorId = device.metadata?.smartMonitorId;
    if (!smartMonitorId) return;
    
    const newThresholds = {
      tempHigh: parseFloat(editingThresholds.tempHigh) || 35,
      humidityHigh: parseFloat(editingThresholds.humidityHigh) || 80,
      dustHigh: parseFloat(editingThresholds.dustHigh) || 400,
      mq2High: parseFloat(editingThresholds.mq2High) || 60,
    };
    
    setSavingThresholds(true);
    try {
      await airguardApi.setThresholds(smartMonitorId, newThresholds);
      setThresholds(newThresholds);
      setShowThresholdSettings(false);
      Alert.alert('Success', 'Thresholds sent to Airguard. Changes will apply when device receives the command.');
    } catch (error) {
      console.error('Failed to save thresholds:', error);
      Alert.alert('Error', 'Failed to save thresholds. Please try again.');
    } finally {
      setSavingThresholds(false);
    }
  }, [device, editingThresholds, airguardApi]);

  // Poll airguard data while modal is visible
  useEffect(() => {
    if (!visible || !device || device.type !== 'airguard') {
      setLiveAirguardData(null);
      setShowThresholdSettings(false);
      return;
    }
    
    // Initial fetch
    fetchAirguardData();
    fetchThresholds();
    
    // Poll every 3 seconds
    const interval = setInterval(fetchAirguardData, 3000);
    
    return () => clearInterval(interval);
  }, [visible, device, fetchAirguardData, fetchThresholds]);

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
                {/* Alert banner if device is alerting - show which stats caused it */}
                {(() => {
                  const reasons: string[] = [];
                  // Use live data if available, fallback to device data
                  const aq = liveAirguardData ?? device.airQualityData;
                  if (aq?.dust != null && aq.dust > thresholds.dustHigh) reasons.push('Dust');
                  if (aq?.mq2 != null && aq.mq2 > thresholds.mq2High) reasons.push('Gas');
                  if (aq?.temperature != null && aq.temperature > thresholds.tempHigh) reasons.push('Temp');
                  if (aq?.humidity != null && aq.humidity > thresholds.humidityHigh) reasons.push('Humidity');
                  const hasAlert = (device.airQualityData?.alert) || reasons.length > 0;
                  if (!hasAlert) return null;
                  return (
                    <View style={styles.alertBanner}>
                      <CloudOff size={16} color="#fff" />
                      <Text style={styles.alertBannerText}>
                        Alert: {reasons.length > 0 ? reasons.join(', ') : 'Air Quality'}
                      </Text>
                    </View>
                  );
                })()}

                {/* Use live data if available, fallback to device data */}
                {(() => {
                  const aq = liveAirguardData ?? device.airQualityData;
                  const temp = aq?.temperature;
                  const hum = aq?.humidity;
                  const dust = aq?.dust;
                  const mq2 = aq?.mq2;
                  const isMuted = liveAirguardData?.buzzer === false || device.alarmMuted;
                  
                  // Use dynamic thresholds
                  const tempAlert = (temp ?? 0) > thresholds.tempHigh;
                  const humAlert = (hum ?? 0) > thresholds.humidityHigh;
                  const dustAlert = (dust ?? 0) > thresholds.dustHigh;
                  const mq2Alert = (mq2 ?? 0) > thresholds.mq2High;
                  
                  return (
                    <>
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
                        onPress={() => onToggleMute?.(device.id, !isMuted)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={isMuted ? ['#FF6B6B', '#FF8E53'] : [colors.muted, colors.muted]}
                          style={styles.muteButtonGradient}
                        >
                          {isMuted ? (
                            <VolumeX size={22} color="#fff" />
                          ) : (
                            <Volume2 size={22} color={colors.mutedForeground} />
                          )}
                          <Text style={[styles.muteLabel, isMuted && styles.muteLabelActive]}>
                            {isMuted ? 'Alarm Muted' : 'Mute Alarm'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Threshold Settings Toggle */}
                      <TouchableOpacity
                        style={styles.thresholdToggle}
                        onPress={() => setShowThresholdSettings(!showThresholdSettings)}
                        activeOpacity={0.8}
                      >
                        <Settings size={18} color={colors.mutedForeground} />
                        <Text style={styles.thresholdToggleText}>
                          {showThresholdSettings ? 'Hide Threshold Settings' : 'Threshold Settings'}
                        </Text>
                      </TouchableOpacity>

                      {/* Threshold Settings Panel */}
                      {showThresholdSettings && (
                        <View style={styles.thresholdPanel}>
                          <Text style={styles.thresholdPanelTitle}>Alert Thresholds</Text>
                          <Text style={styles.thresholdPanelSubtitle}>
                            Set the values at which alerts will trigger
                          </Text>
                          
                          <View style={styles.thresholdRow}>
                            <View style={styles.thresholdInputGroup}>
                              <Thermometer size={16} color={colors.primary} />
                              <Text style={styles.thresholdLabel}>Temp (°C)</Text>
                              <TextInput
                                style={styles.thresholdInput}
                                value={editingThresholds.tempHigh}
                                onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, tempHigh: text }))}
                                keyboardType="numeric"
                                placeholder="35"
                                placeholderTextColor={colors.mutedForeground}
                              />
                            </View>
                            
                            <View style={styles.thresholdInputGroup}>
                              <Droplets size={16} color={colors.primary} />
                              <Text style={styles.thresholdLabel}>Humidity (%)</Text>
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
                          
                          <View style={styles.thresholdRow}>
                            <View style={styles.thresholdInputGroup}>
                              <Wind size={16} color={colors.primary} />
                              <Text style={styles.thresholdLabel}>Dust</Text>
                              <TextInput
                                style={styles.thresholdInput}
                                value={editingThresholds.dustHigh}
                                onChangeText={(text) => setEditingThresholds(prev => ({ ...prev, dustHigh: text }))}
                                keyboardType="numeric"
                                placeholder="400"
                                placeholderTextColor={colors.mutedForeground}
                              />
                            </View>
                            
                            <View style={styles.thresholdInputGroup}>
                              <Fan size={16} color={colors.primary} />
                              <Text style={styles.thresholdLabel}>Gas/Smoke</Text>
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
                        </View>
                      )}
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
  });
