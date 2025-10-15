import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

interface DeviceTileProps {
  icon: string;
  name: string;
  value?: number | string;
  unit?: string;
  isActive?: boolean;
  onPress?: () => void;
}

export default function DeviceTile({
  icon,
  name,
  value,
  unit,
  isActive = false,
  onPress,
}: DeviceTileProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.activeContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          isActive && styles.activeIconContainer,
        ]}
      >
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={isActive ? 'white' : colors.primary}
        />
      </View>
      
      <View style={styles.content}>
        {value !== undefined ? (
          <View style={styles.valueContainer}>
            <Text style={[styles.value, isActive && styles.activeText]}>
              {value}
            </Text>
            {unit && (
              <Text style={[styles.unit, isActive && styles.activeUnit]}>
                {unit}
              </Text>
            )}
          </View>
        ) : null}
        <Text style={[styles.name, isActive && styles.activeText]}>
          {name}
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
    width: '47%',
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
    fontSize: 12,
    color: colors.foreground,
  },
  activeText: {
    color: 'white',
  },
  activeUnit: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});