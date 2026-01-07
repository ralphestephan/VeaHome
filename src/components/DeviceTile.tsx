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
            {typeof device.value === 'number' ? `${device.value}°` :
              device.value === 1 || device.value === 'on' || device.value === true ? 'ON' : 'OFF'}
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
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.md,
  },
  glow: {
    borderRadius: borderRadius.lg,
    shadowColor: '#4D7BFE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  offline: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(77, 123, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  deviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  deviceValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeText: {
    color: '#FFFFFF',
  },
  offlineIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});