import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lightbulb,
  Thermometer,
  Fan,
  Tv,
  Speaker,
  Wifi,
  Camera,
  Lock,
  Power,
  Blinds,
  Snowflake,
  LucideIcon,
  WifiOff,
  Wind,
  Sun,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, animations } from '../constants/theme';
import AnimatedPressable from './ui/AnimatedPressable';

// Comprehensive icon mapping for device types
const iconMap: Record<string, LucideIcon> = {
  'lightbulb': Lightbulb,
  'lightbulb-outline': Lightbulb,
  'light': Lightbulb,
  'desk-lamp': Lightbulb,
  'thermometer': Thermometer,
  'thermostat': Thermometer,
  'ac': Snowflake,
  'fan': Wind,
  'television': Tv,
  'tv': Tv,
  'speaker': Speaker,
  'wifi': Wifi,
  'camera': Camera,
  'lock': Lock,
  'window-shutter': Blinds,
  'shutter': Blinds,
  'blind': Blinds,
  'sensor': Wifi,
  'airguard': Wind,
};

interface DeviceTileProps {
  /** Icon name matching the iconMap keys */
  icon: string;
  /** Device display name */
  name: string;
  /** Current value (e.g., temperature, brightness) */
  value?: number | string;
  /** Unit for the value (e.g., °C, %) */
  unit?: string;
  /** Whether the device is currently active/on */
  isActive?: boolean;
  /** Whether the device is online */
  isOnline?: boolean;
  /** Room name for context */
  roomName?: string;
  /** Press handler for opening device details */
  onPress?: () => void;
  /** Long press handler for advanced options */
  onLongPress?: () => void;
  /** Toggle handler for the power button - directly toggles on/off */
  onToggle?: () => void;
  /** Whether the tile is in a loading state */
  loading?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Device type for styling */
  type?: string;
}

/**
 * DeviceTile - Interactive device control card matching Connect Home design
 * Features:
 * - Blue highlight when active (matching the reference design)
 * - Large icon with value display
 * - Animated press feedback
 * - Value badge for dimmable/climate devices
 */
export default function DeviceTile({
  icon,
  name,
  value,
  unit,
  isActive = false,
  isOnline = true,
  roomName,
  onPress,
  onLongPress,
  onToggle,
  loading = false,
  compact = false,
  type,
}: DeviceTileProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows, compact), [colors, gradients, shadows, compact]);

  const IconComponent = iconMap[icon] || iconMap[type || ''] || Lightbulb;

  // Determine if this device shows a value
  const showValue = value !== undefined && value !== null;
  const isClimate = type === 'thermostat' || type === 'ac' || icon === 'thermometer' || icon === 'ac';
  const isDimmable = type === 'light' || icon?.includes('light') || icon === 'lightbulb';

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={loading}
      style={styles.touchable}
    >
      <View
        style={[
          styles.container,
          isActive && styles.activeContainer,
          !isOnline && styles.offlineContainer,
        ]}
      >
        {/* Power button in top-right corner */}
        {onToggle && (
          <TouchableOpacity
            style={[
              styles.powerButton,
              isActive && styles.powerButtonActive,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggle();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Power size={16} color={isActive ? '#FFFFFF' : colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Main content */}
        <View style={styles.content}>
          {/* Icon with optional value badge */}
          <View style={styles.iconRow}>
            <View style={[
              styles.iconContainer,
              isActive && styles.activeIconContainer,
            ]}>
              <IconComponent
                size={compact ? 20 : 24}
                color={isActive ? '#FFFFFF' : colors.primary}
              />
            </View>

            {/* Value badge for dimmable/climate devices */}
            {showValue && isActive && (
              <View style={styles.valueBadge}>
                <Text style={styles.valueBadgeText}>
                  {typeof value === 'number' ? Math.round(value) : value}
                  {unit && <Text style={styles.valueBadgeUnit}>{unit}</Text>}
                </Text>
              </View>
            )}
          </View>

          {/* Device name */}
          <Text
            style={[styles.name, isActive && styles.activeText]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {name}
          </Text>

          {/* Status text */}
          <Text style={[styles.status, isActive && styles.activeStatus]}>
            {!isOnline ? 'Offline' : isActive ? (showValue ? `${value}${unit || ''}` : 'On') : 'Off'}
          </Text>
        </View>

        {/* Active indicator bar at bottom */}
        {isActive && (
          <View style={styles.activeBar} />
        )}

        {/* Offline overlay */}
        {!isOnline && (
          <View style={styles.offlineOverlay}>
            <WifiOff size={14} color={colors.offline} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const createStyles = (
  colors: any,
  gradients: any,
  shadows: any,
  compact: boolean
) => StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    backgroundColor: colors.glassLight, // Frosted glass for inactive
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border for glassmorphism
    minHeight: compact ? 120 : 130, // Increased for better visual balance
    position: 'relative',
    overflow: 'hidden',
  },
  activeContainer: {
    backgroundColor: '#4D7BFE', // Solid neon blue matching reference
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...shadows.neonBlue, // Strong glow effect
  },
  offlineContainer: {
    opacity: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  powerButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  powerButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: compact ? 40 : 44, // Slightly larger for better prominence
    height: compact ? 40 : 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Subtle background in active state
  },
  valueBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  valueBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  valueBadgeUnit: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  name: {
    fontSize: compact ? fontSize.sm : fontSize.md,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: spacing.sm,
    lineHeight: (compact ? fontSize.sm : fontSize.md) * 1.4,
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  status: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
    fontWeight: fontWeight.medium,
  },
  activeStatus: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  activeBar: {
    display: 'none', // Removed - not in reference design
  },
  offlineOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'transparent',
  },
});