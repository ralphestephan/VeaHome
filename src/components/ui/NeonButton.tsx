import React, { useMemo } from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface NeonButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  glow?: boolean;
}

/**
 * NeonButton - Primary button component with gradient backgrounds and glow effects
 * Supports multiple variants, sizes, icons, and loading states
 */
export default function NeonButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  glow = false,
}: NeonButtonProps) {
  const { colors, gradients, shadows } = useTheme();

  const sizeStyles = useMemo(() => {
    const sizes = {
      sm: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.sm,
        iconSize: 14,
        gap: spacing.xs,
        borderRadius: borderRadius.md,
      },
      md: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        iconSize: 18,
        gap: spacing.sm,
        borderRadius: borderRadius.lg,
      },
      lg: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md + spacing.xs,
        fontSize: fontSize.lg,
        iconSize: 22,
        gap: spacing.sm,
        borderRadius: borderRadius.xl,
      },
    };
    return sizes[size];
  }, [size]);

  const variantConfig = useMemo(() => {
    const configs: Record<ButtonVariant, {
      gradient: readonly [string, string];
      textColor: string;
      borderColor: string;
      shadowStyle: object;
    }> = {
      primary: {
        gradient: gradients.accent,
        textColor: '#FFFFFF',
        borderColor: 'transparent',
        shadowStyle: glow ? shadows.neonPrimary : shadows.md,
      },
      secondary: {
        gradient: gradients.card,
        textColor: colors.foreground,
        borderColor: colors.border,
        shadowStyle: shadows.sm,
      },
      outline: {
        gradient: ['transparent', 'transparent'],
        textColor: colors.primary,
        borderColor: colors.primary,
        shadowStyle: {},
      },
      ghost: {
        gradient: ['transparent', 'transparent'],
        textColor: colors.foreground,
        borderColor: 'transparent',
        shadowStyle: {},
      },
      destructive: {
        gradient: gradients.destructive,
        textColor: '#FFFFFF',
        borderColor: 'transparent',
        shadowStyle: glow ? { ...shadows.md, shadowColor: colors.destructive } : shadows.md,
      },
      success: {
        gradient: gradients.success,
        textColor: '#FFFFFF',
        borderColor: 'transparent',
        shadowStyle: glow ? { ...shadows.md, shadowColor: colors.success } : shadows.md,
      },
    };
    return configs[variant];
  }, [variant, colors, gradients, shadows, glow]);

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <LinearGradient
        colors={variantConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          {
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            borderRadius: sizeStyles.borderRadius,
            borderColor: variantConfig.borderColor,
            borderWidth: variant === 'outline' ? 1.5 : 1,
          },
          variantConfig.shadowStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantConfig.textColor} />
        ) : (
          <>
            {Icon && iconPosition === 'left' && (
              <Icon size={sizeStyles.iconSize} color={variantConfig.textColor} />
            )}
            <Text
              style={[
                styles.text,
                {
                  fontSize: sizeStyles.fontSize,
                  color: variantConfig.textColor,
                  marginLeft: Icon && iconPosition === 'left' ? sizeStyles.gap : 0,
                  marginRight: Icon && iconPosition === 'right' ? sizeStyles.gap : 0,
                },
                textStyle,
              ]}
            >
              {children}
            </Text>
            {Icon && iconPosition === 'right' && (
              <Icon size={sizeStyles.iconSize} color={variantConfig.textColor} />
            )}
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
