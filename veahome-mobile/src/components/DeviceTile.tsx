import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { Device } from '../types';

interface DeviceTileProps {
  device: Device;
  onPress?: () => void;
}

const getDeviceIcon = (type: Device['type']): string => {
  const iconMap: Record<Device['type'], string> = {
    light: 'lightbulb',
    thermostat: 'thermometer',
    tv: 'television',
    ac: 'air-conditioner',
    blind: 'window-shutter',
    shutter: 'window-shutter-open',
    lock: 'lock',
    camera: 'cctv',
    speaker: 'speaker',
    sensor: 'gauge',
  };
  return iconMap[type] || 'devices';
};

export default function DeviceTile({ device, onPress }: DeviceTileProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        device.isActive && styles.activeContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          device.isActive && styles.activeIconContainer,
        ]}
      >
        <MaterialCommunityIcons
          name={getDeviceIcon(device.type)}
          size={20}
          color={device.isActive ? 'white' : colors.primary}
        />
      </View>
      
      <View style={styles.content}>
        {device.value !== undefined ? (
          <View style={styles.valueContainer}>
            <Text style={[styles.value, device.isActive && styles.activeText]}>
              {device.value}
            </Text>
            <Text style={[styles.unit, device.isActive && styles.activeUnit]}>
              {device.unit}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.name, device.isActive && styles.activeText]}>
          {device.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activeContainer: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    gap: spacing.xs,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
  },
  unit: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  name: {
    fontSize: 13,
    color: colors.foreground,
  },
  activeText: {
    color: 'white',
  },
  activeUnit: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});