import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Thermometer, 
  Droplets, 
  Lightbulb, 
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import AnimatedPressable from './ui/AnimatedPressable';
import StatusBadge from './ui/StatusBadge';

interface RoomTileProps {
  /** Room identifier */
  id: string;
  /** Room display name */
  name: string;
  /** Optional background image URL */
  image?: string;
  /** Current temperature */
  temperature?: number;
  /** Current humidity percentage */
  humidity?: number;
  /** Number of active lights */
  activeLights?: number;
  /** Total number of devices */
  totalDevices?: number;
  /** Number of devices currently on */
  activeDevices?: number;
  /** Active scene name */
  scene?: string;
  /** Accent color for the room */
  accentColor?: string;
  /** Whether there are any alerts */
  hasAlert?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Tile size variant */
  size?: 'small' | 'medium' | 'large';
}

/**
 * RoomTile - Interactive room card for the dashboard
 * Shows room status at a glance with environmental metrics
 */
export default function RoomTile({
  id,
  name,
  image,
  temperature,
  humidity,
  activeLights = 0,
  totalDevices = 0,
  activeDevices = 0,
  scene,
  accentColor,
  hasAlert = false,
  onPress,
  size = 'medium',
}: RoomTileProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows, size, accentColor), [colors, gradients, shadows, size, accentColor]);

  const sizeConfig = {
    small: { width: 140, height: 120 },
    medium: { width: 200, height: 160 },
    large: { width: '100%' as const, height: 180 },
  };

  const dimensions = sizeConfig[size];

  const defaultRoomImage = 'https://images.unsplash.com/photo-1668816143164-a439b3e687cd?w=400';
  const backgroundImage = image || defaultRoomImage;

  return (
    <AnimatedPressable onPress={onPress} style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <ImageBackground
        source={{ uri: backgroundImage }}
        style={styles.imageBackground}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Gradient overlay */}
        <LinearGradient
          colors={gradients.overlay}
          style={styles.overlay}
        />

        {/* Accent color border glow */}
        {accentColor && (
          <View style={[styles.accentBorder, { borderColor: accentColor + '60' }]} />
        )}

        {/* Alert indicator */}
        {hasAlert && (
          <View style={styles.alertBadge}>
            <AlertTriangle size={12} color={colors.warning} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Top row - scene indicator */}
          {scene && size !== 'small' && (
            <View style={styles.sceneTag}>
              <Text style={styles.sceneText}>{scene}</Text>
            </View>
          )}

          {/* Bottom content */}
          <View style={styles.bottomContent}>
            <Text style={styles.roomName} numberOfLines={1}>{name}</Text>
            
            {/* Stats row */}
            <View style={styles.statsRow}>
              {temperature !== undefined && (
                <View style={styles.stat}>
                  <Thermometer size={12} color={colors.neonCyan} />
                  <Text style={styles.statText}>{temperature}°</Text>
                </View>
              )}
              {humidity !== undefined && size !== 'small' && (
                <View style={styles.stat}>
                  <Droplets size={12} color={colors.neonBlue} />
                  <Text style={styles.statText}>{humidity}%</Text>
                </View>
              )}
              {activeLights > 0 && (
                <View style={styles.stat}>
                  <Lightbulb size={12} color={colors.warning} />
                  <Text style={styles.statText}>{activeLights}</Text>
                </View>
              )}
            </View>

            {/* Device count */}
            {size === 'large' && (
              <View style={styles.deviceCount}>
                <Text style={styles.deviceCountText}>
                  {activeDevices}/{totalDevices} devices on
                </Text>
                <ChevronRight size={14} color={colors.mutedForeground} />
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
}

const createStyles = (
  colors: any,
  gradients: any,
  shadows: any,
  size: 'small' | 'medium' | 'large',
  accentColor?: string
) => StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: borderRadius.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
  },
  accentBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
  },
  alertBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warning + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: size === 'small' ? spacing.sm : spacing.md,
  },
  sceneTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sceneText: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: fontWeight.medium,
  },
  bottomContent: {
    gap: spacing.xs,
  },
  roomName: {
    fontSize: size === 'small' ? fontSize.md : fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  statText: {
    fontSize: fontSize.xs,
    color: '#FFFFFF',
    fontWeight: fontWeight.medium,
  },
  deviceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  deviceCountText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
