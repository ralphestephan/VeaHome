import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon, Package, Wifi, Home, Users, Lightbulb, Zap } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';
import NeonButton from './NeonButton';

type EmptyStateType = 'devices' | 'rooms' | 'hubs' | 'scenes' | 'family' | 'generic';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
}

/**
 * EmptyState - Placeholder for empty lists and screens
 * Provides helpful context and action to guide users
 */
export default function EmptyState({
  type = 'generic',
  title,
  description,
  icon: CustomIcon,
  action,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();

  const presets: Record<EmptyStateType, { icon: LucideIcon; title: string; description: string }> = {
    devices: {
      icon: Lightbulb,
      title: 'No devices yet',
      description: 'Connect your smart devices to start controlling them from here.',
    },
    rooms: {
      icon: Home,
      title: 'No rooms created',
      description: 'Create rooms to organize your devices and control them by area.',
    },
    hubs: {
      icon: Wifi,
      title: 'No hubs connected',
      description: 'Connect a VeaHub to control IR, RF, and relay devices.',
    },
    scenes: {
      icon: Zap,
      title: 'No scenes created',
      description: 'Create scenes to control multiple devices with a single tap.',
    },
    family: {
      icon: Users,
      title: 'No family members',
      description: 'Invite family members to share access to your smart home.',
    },
    generic: {
      icon: Package,
      title: 'Nothing here yet',
      description: 'Content will appear here when available.',
    },
  };

  const preset = presets[type];
  const Icon = CustomIcon || preset.icon;
  const displayTitle = title || preset.title;
  const displayDescription = description || preset.description;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
        <Icon size={40} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{displayTitle}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {displayDescription}
      </Text>
      {action && (
        <NeonButton
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={styles.actionButton}
          glow
        >
          {action.label}
        </NeonButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  actionButton: {
    minWidth: 160,
  },
});
