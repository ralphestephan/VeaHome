import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import AnimatedPressable from './ui/AnimatedPressable';

type TrendDirection = 'up' | 'down' | 'neutral';

interface EnergyCardProps {
  /** Current energy usage value */
  currentUsage: string;
  /** Unit (kW, kWh, etc.) */
  unit?: string;
  /** Percentage change from previous period */
  changePercent?: number;
  /** Trend direction */
  trend?: TrendDirection;
  /** Time period label */
  period?: string;
  /** Estimated cost (optional) */
  estimatedCost?: string;
  /** Press handler for details */
  onPress?: () => void;
  /** Compact mode */
  compact?: boolean;
}

/**
 * EnergyCard - Dashboard energy consumption overview
 * Shows current usage with trend indicators and optional cost
 */
export default function EnergyCard({
  currentUsage,
  unit = 'kW',
  changePercent,
  trend = 'neutral',
  period = 'Today',
  estimatedCost,
  onPress,
  compact = false,
}: EnergyCardProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows, compact), [colors, gradients, shadows, compact]);

  const trendConfig = useMemo(() => {
    const configs: Record<TrendDirection, { icon: typeof TrendingUp; color: string; label: string }> = {
      up: { icon: TrendingUp, color: colors.destructive, label: 'increase' },
      down: { icon: TrendingDown, color: colors.success, label: 'decrease' },
      neutral: { icon: Minus, color: colors.mutedForeground, label: 'stable' },
    };
    return configs[trend];
  }, [trend, colors]);

  const TrendIcon = trendConfig.icon;

  const content = (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Zap size={18} color={colors.success} />
        </View>
        <Text style={styles.periodLabel}>{period}</Text>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.usageRow}>
          <Text style={styles.usageValue}>{currentUsage}</Text>
          <Text style={styles.usageUnit}>{unit}</Text>
        </View>

        {changePercent !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trendConfig.color + '20' }]}>
            <TrendIcon size={12} color={trendConfig.color} />
            <Text style={[styles.trendText, { color: trendConfig.color }]}>
              {Math.abs(changePercent)}%
            </Text>
          </View>
        )}
      </View>

      {estimatedCost && !compact && (
        <View style={styles.footer}>
          <Text style={styles.costLabel}>Est. cost</Text>
          <Text style={styles.costValue}>{estimatedCost}</Text>
        </View>
      )}

      {/* Decorative energy bars */}
      <View style={styles.barsContainer}>
        {[0.3, 0.5, 0.8, 0.6, 0.4, 0.7, 0.5].map((height, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: height * (compact ? 20 : 30),
                backgroundColor: i === 2 ? colors.success : colors.muted,
              },
            ]}
          />
        ))}
      </View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress}>
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const createStyles = (colors: any, gradients: any, shadows: any, compact: boolean) => StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: compact ? 100 : 140,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: compact ? 0 : spacing.sm,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  usageValue: {
    fontSize: compact ? fontSize.xxl : fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  usageUnit: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  costLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  costValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  barsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    opacity: 0.4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
