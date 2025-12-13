import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';

type IconButtonVariant = 'default' | 'filled' | 'outline' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

/**
 * IconButton - Circular button for icon-only actions
 * Used for toolbars, headers, and quick actions
 */
export default function IconButton({
  icon: Icon,
  onPress,
  variant = 'default',
  size = 'md',
  color,
  disabled = false,
  style,
  glow = false,
}: IconButtonProps) {
  const { colors, shadows } = useTheme();

  const sizeConfig = useMemo(() => {
    const sizes = {
      sm: { container: 32, icon: 16 },
      md: { container: 44, icon: 20 },
      lg: { container: 52, icon: 24 },
    };
    return sizes[size];
  }, [size]);

  const variantStyles = useMemo(() => {
    const configs: Record<IconButtonVariant, {
      backgroundColor: string;
      borderColor: string;
      iconColor: string;
    }> = {
      default: {
        backgroundColor: colors.muted,
        borderColor: 'transparent',
        iconColor: color || colors.foreground,
      },
      filled: {
        backgroundColor: colors.primary,
        borderColor: 'transparent',
        iconColor: color || '#FFFFFF',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        iconColor: color || colors.foreground,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        iconColor: color || colors.mutedForeground,
      },
    };
    return configs[variant];
  }, [variant, colors, color]);

  const glowStyle = glow && variant === 'filled' ? shadows.neonPrimary : {};

  return (
    <AnimatedPressable onPress={onPress} disabled={disabled}>
      <View
        style={[
          styles.container,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            backgroundColor: variantStyles.backgroundColor,
            borderColor: variantStyles.borderColor,
            borderWidth: variant === 'outline' ? 1 : 0,
          },
          glowStyle,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Icon size={sizeConfig.icon} color={variantStyles.iconColor} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
