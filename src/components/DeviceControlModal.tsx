import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { Device } from '../types';

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

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
                  <Text style={styles.deviceRoom}>{device.roomId || 'Unknown Room'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Main Control Area */}
            {isAirguard ? (
              <View style={styles.airguardControl}>
                <View style={styles.airguardMetrics}>
                  <View style={styles.airguardMetricCard}>
                    <Thermometer size={24} color={colors.primary} />
                    <Text style={styles.airguardMetricValue}>
                      {device.airQualityData?.temperature ?? '--'}°C
                    </Text>
                    <Text style={styles.airguardMetricLabel}>Temperature</Text>
                  </View>

                  <View style={styles.airguardMetricCard}>
                    <Droplets size={24} color={colors.primary} />
                    <Text style={styles.airguardMetricValue}>
                      {device.airQualityData?.humidity ?? '--'}%
                    </Text>
                    <Text style={styles.airguardMetricLabel}>Humidity</Text>
                  </View>

                  <View style={styles.airguardMetricCard}>
                    <Wind size={24} color={colors.primary} />
                    <Text style={styles.airguardMetricValue}>
                      {device.airQualityData?.aqi ?? '--'}
                    </Text>
                    <Text style={styles.airguardMetricLabel}>AQI</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.muteButton, device.alarmMuted && styles.muteButtonActive]}
                  onPress={() => onToggleMute?.(device.id, !device.alarmMuted)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={device.alarmMuted ? ['#FF6B6B', '#FF8E53'] : [colors.muted, colors.muted]}
                    style={styles.muteButtonGradient}
                  >
                    {device.alarmMuted ? (
                      <VolumeX size={22} color="#fff" />
                    ) : (
                      <Volume2 size={22} color={colors.mutedForeground} />
                    )}
                    <Text style={[styles.muteLabel, device.alarmMuted && styles.muteLabelActive]}>
                      {device.alarmMuted ? 'Alarm Muted' : 'Mute Alarm'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {onDelete && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete(device.id)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#FF8E53']}
                      style={styles.deleteButtonGradient}
                    >
                      <Text style={styles.deleteButtonText}>Remove Device</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
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
      gap: spacing.xl,
    },
    airguardMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    airguardMetricCard: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
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
