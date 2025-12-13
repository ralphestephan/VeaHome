import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';
import AnimatedPressable from './AnimatedPressable';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
type ChipSize = 'sm' | 'md';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: LucideIcon;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Chip - Small tag/filter component for categories, status, and selections
 */
export default function Chip({
  label,
  variant = 'default',
  size = 'md',
  icon: Icon,
  selected = false,
  onPress,
  disabled = false,
  style,
}: ChipProps) {
  const { colors } = useTheme();

  const sizeStyles = useMemo(() => {
    const sizes = {
      sm: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        fontSize: fontSize.xs,
        iconSize: 12,
      },
      md: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.sm,
        iconSize: 14,
      },
    };
    return sizes[size];
  }, [size]);

  const variantColors = useMemo(() => {
    const colorConfigs: Record<ChipVariant, { bg: string; text: string; border: string }> = {
      default: {
        bg: selected ? colors.muted : 'transparent',
        text: selected ? colors.foreground : colors.mutedForeground,
        border: colors.border,
      },
      primary: {
        bg: selected ? colors.primary : colors.primary + '15',
        text: selected ? '#FFFFFF' : colors.primary,
        border: colors.primary + '40',
      },
      success: {
        bg: selected ? colors.success : colors.success + '15',
        text: selected ? '#FFFFFF' : colors.success,
        border: colors.success + '40',
      },
      warning: {
        bg: selected ? colors.warning : colors.warning + '15',
        text: selected ? '#FFFFFF' : colors.warning,
        border: colors.warning + '40',
      },
      destructive: {
        bg: selected ? colors.destructive : colors.destructive + '15',
        text: selected ? '#FFFFFF' : colors.destructive,
        border: colors.destructive + '40',
      },
      info: {
        bg: selected ? colors.info : colors.info + '15',
        text: selected ? '#FFFFFF' : colors.info,
        border: colors.info + '40',
      },
    };
    return colorConfigs[variant];
  }, [variant, selected, colors]);

  const chipContent = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantColors.bg,
          borderColor: variantColors.border,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={sizeStyles.iconSize}
          color={variantColors.text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: variantColors.text, fontSize: sizeStyles.fontSize },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} disabled={disabled} scaleValue={0.95}>
        {chipContent}
      </AnimatedPressable>
    );
  }

  return chipContent;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
