import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Lightbulb,
  Thermometer,
  Fan,
  Tv,
  Speaker,
  Blinds,
  Lock,
  Camera,
  Wind
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, shadows } from '../constants/theme';
import { Device } from '../types';

interface DeviceTileProps {
  device: Device;
  onPress: () => void;
}

const getDeviceIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    light: Lightbulb,
    thermostat: Thermometer,
    ac: Thermometer,
    fan: Fan,
    tv: Tv,
    speaker: Speaker,
    blind: Blinds,
    shutter: Blinds,
    lock: Lock,
    camera: Camera,
    sensor: Wind,
    airguard: Wind,
  };
  return iconMap[type] || Lightbulb;
};

export default function DeviceTile({ device, onPress }: DeviceTileProps) {
  const { colors } = useTheme();

  // Safety check - if device is undefined/null, render nothing
  if (!device) {
    return null;
  }

  const IconComponent = getDeviceIcon(device.type);
  const isActive = device.value === 1 || device.value === '1' || device.value === 'on' || device.value === true;
  const isOnline = device.isOnline !== false;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <LinearGradient
        colors={isActive
          ? ['#4D7BFE', '#6366F1']  // Vibrant neon blue gradient when active
          : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}  // Dark glass when inactive
        style={[
          styles.card,
          !isOnline && styles.offline
        ]}
      >
        {/* Glow effect for active state */}
        {isActive && (
          <View style={[StyleSheet.absoluteFill, styles.glow]} />
        )}

        {/* Icon */}
        <View style={[
          styles.iconContainer,
          isActive && styles.iconActive
        ]}>
          <IconComponent
            size={32}
            color={isActive ? '#FFFFFF' : '#4D7BFE'}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </View>

        {/* Device Name */}
        <Text
          style={[
            styles.deviceName,
            isActive && styles.activeText
          ]}
          numberOfLines={1}
        >
          {device.name}
        </Text>

        {/* Status/Value */}
        {device.value !== undefined && device.value !== null && (
          <Text
            style={[
              styles.deviceValue,
              isActive && styles.activeText
            ]}
          >
            {typeof device.value === 'number' && device.type !== 'light' ? `${device.value}°` :
              String(device.value) === '1' || String(device.value) === 'on' || device.value === true ? 'ON' : 'OFF'}
          </Text>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <View style={styles.offlineDot} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg, // Ensure efficient clipping
    ...shadows.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md, // Reduced padding for better use of space
    minHeight: 120, // Slightly reduced to look more compact/premium
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glow: {
    borderRadius: borderRadius.lg,
    shadowColor: '#4D7BFE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15, // Softer glow
    elevation: 5,
  },
  offline: {
    opacity: 0.6, // Less transparent to keep readability
  },
  iconContainer: {
    width: 44, // Smaller, more refined icon container
    height: 44,
    borderRadius: borderRadius.full, // Circle looks more modern
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
  },
  deviceValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offlineIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  offlineDot: {
    // Removed nested dot, using offlineIndicator directly
  },
});