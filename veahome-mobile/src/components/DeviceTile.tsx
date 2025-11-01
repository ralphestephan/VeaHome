import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Lightbulb, 
  Thermometer, 
  Fan, 
  Tv, 
  Speaker, 
  Wifi, 
  Camera, 
  Lock, 
  LucideIcon 
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

// Icon mapping from MaterialCommunityIcons names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'lightbulb': Lightbulb,
  'lightbulb-outline': Lightbulb,
  'desk-lamp': Lightbulb,
  'thermometer': Thermometer,
  'fan': Fan,
  'television': Tv,
  'speaker': Speaker,
  'wifi': Wifi,
  'camera': Camera,
  'lock': Lock,
  'window-shutter': Fan, // Using Fan as placeholder for window shutters
};

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
  const IconComponent = iconMap[icon] || Lightbulb; // Default to Lightbulb if icon not found
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.activeContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            isActive && styles.activeIconContainer,
          ]}
        >
          <IconComponent
            size={20}
            color={isActive ? 'white' : colors.primary}
          />
        </View>
        
        <View style={styles.textContent}>
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: '47%',
    overflow: 'hidden',
  },
  activeContainer: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  content: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
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
  textContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
  },
  unit: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  name: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  activeText: {
    color: 'white',
  },
  activeUnit: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});