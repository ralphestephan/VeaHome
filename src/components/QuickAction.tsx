import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import AnimatedPressable from './ui/AnimatedPressable';

type QuickActionVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

interface QuickActionProps {
  /** Action icon */
  icon: LucideIcon;
  /** Action label */
  label: string;
  /** Optional sublabel for additional context */
  sublabel?: string;
  /** Visual variant */
  variant?: QuickActionVariant;
  /** Press handler */
  onPress?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Whether the action is currently active */
  isActive?: boolean;
}

/**
 * QuickAction - Large touch-friendly action button for dashboard
 * Used for common actions like "All lights off", "Arm Away", etc.
 */
export default function QuickAction({
  icon: Icon,
  label,
  sublabel,
  variant = 'default',
  onPress,
  loading = false,
  disabled = false,
  isActive = false,
}: QuickActionProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);

  const variantConfig = useMemo(() => {
    const configs: Record<QuickActionVariant, {
      gradient: readonly [string, string];
      iconColor: string;
      borderColor: string;
      glowColor?: string;
    }> = {
      default: {
        gradient: isActive ? gradients.cardActive : gradients.card,
        iconColor: isActive ? colors.primary : colors.mutedForeground,
        borderColor: isActive ? colors.primary + '40' : colors.border,
        glowColor: isActive ? colors.primary : undefined,
      },
      primary: {
        gradient: gradients.accent,
        iconColor: '#FFFFFF',
        borderColor: 'transparent',
        glowColor: colors.primary,
      },
      success: {
        gradient: gradients.success,
        iconColor: '#FFFFFF',
        borderColor: 'transparent',
        glowColor: colors.success,
      },
      warning: {
        gradient: gradients.warning,
        iconColor: '#FFFFFF',
        borderColor: 'transparent',
        glowColor: colors.warning,
      },
      destructive: {
        gradient: gradients.destructive,
        iconColor: '#FFFFFF',
        borderColor: 'transparent',
        glowColor: colors.destructive,
      },
    };
    return configs[variant];
  }, [variant, isActive, colors, gradients]);

  const glowStyle = variantConfig.glowColor ? {
    shadowColor: variantConfig.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  } : {};

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable 
      onPress={onPress} 
      disabled={isDisabled}
      style={styles.touchable}
    >
      <LinearGradient
        colors={variantConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          { borderColor: variantConfig.borderColor },
          glowStyle,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantConfig.iconColor} />
        ) : (
          <View style={[
            styles.iconContainer,
            variant === 'default' && { backgroundColor: colors.muted },
          ]}>
            <Icon size={20} color={variantConfig.iconColor} />
          </View>
        )}
        
        <View style={styles.textContent}>
          <Text 
            style={[
              styles.label,
              variant !== 'default' && styles.labelLight,
              isActive && styles.labelActive,
            ]} 
            numberOfLines={1}
          >
            {label}
          </Text>
          {sublabel && (
            <Text 
              style={[
                styles.sublabel,
                variant !== 'default' && styles.sublabelLight,
              ]} 
              numberOfLines={1}
            >
              {sublabel}
            </Text>
          )}
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) => StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 72,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  labelLight: {
    color: '#FFFFFF',
  },
  labelActive: {
    color: colors.primary,
  },
  sublabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sublabelLight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
