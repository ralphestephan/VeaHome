import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';

type NeonCardVariant = 'default' | 'elevated' | 'active' | 'success' | 'warning' | 'destructive';
type GlowColor = 'primary' | 'neonBlue' | 'neonPurple' | 'neonCyan' | 'neonPink' | 'success' | 'warning' | 'none';

interface NeonCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: NeonCardVariant;
  glow?: GlowColor;
  glowIntensity?: 'low' | 'medium' | 'high';
  onPress?: () => void;
  disabled?: boolean;
  noPadding?: boolean;
}

/**
 * NeonCard - Glass-morphism card with optional neon glow effects
 * The primary container component for the futuristic UI
 */
export default function NeonCard({
  children,
  style,
  variant = 'default',
  glow = 'none',
  glowIntensity = 'medium',
  onPress,
  disabled = false,
  noPadding = false,
}: NeonCardProps) {
  const { colors, gradients, shadows } = useTheme();

  const cardGradient = useMemo(() => {
    switch (variant) {
      case 'elevated':
        return gradients.cardHover;
      case 'active':
        return gradients.cardActive;
      case 'success':
        return [colors.success + '15', colors.card] as const;
      case 'warning':
        return [colors.warning + '15', colors.card] as const;
      case 'destructive':
        return [colors.destructive + '15', colors.card] as const;
      default:
        return gradients.card;
    }
  }, [variant, colors, gradients]);

  const glowStyle = useMemo(() => {
    if (glow === 'none') return {};
    
    const intensityMap = {
      low: 0.2,
      medium: 0.35,
      high: 0.5,
    };
    const opacity = intensityMap[glowIntensity];
    const radius = glowIntensity === 'high' ? 20 : glowIntensity === 'medium' ? 14 : 8;
    
    const colorMap: Record<GlowColor, string> = {
      primary: colors.primary,
      neonBlue: colors.neonBlue,
      neonPurple: colors.neonPurple,
      neonCyan: colors.neonCyan,
      neonPink: colors.neonPink,
      success: colors.success,
      warning: colors.warning,
      none: 'transparent',
    };

    return {
      shadowColor: colorMap[glow],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation: 8,
    };
  }, [glow, glowIntensity, colors]);

  const borderColor = useMemo(() => {
    if (variant === 'active') return colors.primary + '40';
    if (glow !== 'none') {
      const colorMap: Record<GlowColor, string> = {
        primary: colors.primary,
        neonBlue: colors.neonBlue,
        neonPurple: colors.neonPurple,
        neonCyan: colors.neonCyan,
        neonPink: colors.neonPink,
        success: colors.success,
        warning: colors.warning,
        none: colors.border,
      };
      return colorMap[glow] + '30';
    }
    return colors.border;
  }, [variant, glow, colors]);

  const content = (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        !noPadding && styles.cardPadding,
        { borderColor },
        glowStyle,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} disabled={disabled}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPadding: {
    padding: spacing.md,
  },
});
