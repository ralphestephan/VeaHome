import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';

type StatusBadgeVariant = 'online' | 'offline' | 'warning' | 'error' | 'info' | 'success';
type StatusBadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label?: string;
  size?: StatusBadgeSize;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * StatusBadge - Indicator for device/connection status
 * Shows a colored dot with optional label and pulse animation for live status
 */
export default function StatusBadge({
  variant,
  label,
  size = 'md',
  pulse = false,
  style,
}: StatusBadgeProps) {
  const { colors } = useTheme();

  const sizeConfig = useMemo(() => {
    const sizes = {
      sm: { dot: 6, fontSize: fontSize.xs, gap: spacing.xs },
      md: { dot: 8, fontSize: fontSize.sm, gap: spacing.xs },
      lg: { dot: 10, fontSize: fontSize.md, gap: spacing.sm },
    };
    return sizes[size];
  }, [size]);

  const statusColor = useMemo(() => {
    const colorMap: Record<StatusBadgeVariant, string> = {
      online: colors.online,
      offline: colors.offline,
      warning: colors.warning,
      error: colors.destructive,
      info: colors.info,
      success: colors.success,
    };
    return colorMap[variant];
  }, [variant, colors]);

  const defaultLabels: Record<StatusBadgeVariant, string> = {
    online: 'Online',
    offline: 'Offline',
    warning: 'Warning',
    error: 'Error',
    info: 'Info',
    success: 'Success',
  };

  const displayLabel = label ?? defaultLabels[variant];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dotContainer}>
        <View
          style={[
            styles.dot,
            {
              width: sizeConfig.dot,
              height: sizeConfig.dot,
              backgroundColor: statusColor,
            },
          ]}
        />
        {pulse && variant === 'online' && (
          <View
            style={[
              styles.pulseRing,
              {
                width: sizeConfig.dot * 2,
                height: sizeConfig.dot * 2,
                borderColor: statusColor,
              },
            ]}
          />
        )}
      </View>
      {displayLabel && (
        <Text
          style={[
            styles.label,
            { 
              color: statusColor, 
              fontSize: sizeConfig.fontSize,
              marginLeft: sizeConfig.gap,
            },
          ]}
        >
          {displayLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderRadius: borderRadius.full,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    opacity: 0.4,
  },
  label: {
    fontWeight: fontWeight.medium,
  },
});
