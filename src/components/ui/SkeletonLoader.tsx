import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StyleProp, ViewStyle, Easing, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'button' | 'custom';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  count?: number;
  gap?: number;
}

/**
 * SkeletonLoader - Animated shimmer placeholder for loading states
 * Provides visual feedback while content is being fetched
 */
export default function SkeletonLoader({
  variant = 'text',
  width,
  height,
  borderRadius: customBorderRadius,
  style,
  count = 1,
  gap = spacing.sm,
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const getVariantStyles = (): { width: DimensionValue; height: number; borderRadius: number } => {
    switch (variant) {
      case 'card':
        return { width: width ?? '100%', height: height ?? 120, borderRadius: customBorderRadius ?? borderRadius.xl };
      case 'avatar':
        return { width: width ?? 48, height: height ?? 48, borderRadius: customBorderRadius ?? borderRadius.full };
      case 'button':
        return { width: width ?? 100, height: height ?? 44, borderRadius: customBorderRadius ?? borderRadius.lg };
      case 'text':
      default:
        return { width: width ?? '100%', height: height ?? 16, borderRadius: customBorderRadius ?? borderRadius.sm };
    }
  };

  const variantStyles = getVariantStyles();

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const renderSkeleton = (index: number) => (
    <View
      key={index}
      style={[
        styles.skeleton,
        {
          width: variantStyles.width,
          height: variantStyles.height,
          borderRadius: variantStyles.borderRadius,
          backgroundColor: colors.muted,
          marginTop: index > 0 ? gap : 0,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            colors.card + '60',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );

  return (
    <>
      {Array.from({ length: count }, (_, i) => renderSkeleton(i))}
    </>
  );
}

// Pre-built skeleton compositions for common layouts
export function DeviceTileSkeleton() {
  return (
    <View style={skeletonStyles.deviceTile}>
      <SkeletonLoader variant="avatar" width={40} height={40} />
      <View style={skeletonStyles.deviceTileContent}>
        <SkeletonLoader width="60%" height={20} />
        <SkeletonLoader width="40%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function RoomCardSkeleton() {
  return (
    <View style={skeletonStyles.roomCard}>
      <SkeletonLoader variant="card" height={160} />
    </View>
  );
}

export function DashboardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[skeletonStyles.dashboard, { backgroundColor: colors.background }]}>
      <SkeletonLoader width="50%" height={24} style={{ marginBottom: spacing.md }} />
      <SkeletonLoader variant="card" height={80} style={{ marginBottom: spacing.lg }} />
      <SkeletonLoader width="30%" height={18} style={{ marginBottom: spacing.md }} />
      <View style={skeletonStyles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={skeletonStyles.gridItem}>
            <SkeletonLoader variant="card" height={100} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  shimmerGradient: {
    flex: 1,
    width: 200,
  },
});

const skeletonStyles = StyleSheet.create({
  deviceTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  deviceTileContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  roomCard: {
    width: 200,
    marginRight: spacing.md,
  },
  dashboard: {
    flex: 1,
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47%',
  },
});
