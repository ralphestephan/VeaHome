import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Thermometer, Droplets, Wind } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, shadows } from '../constants/theme';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
  deviceCount?: number;
  temperature?: number;
  humidity?: number;
}

export default function RoomCard({
  room,
  onPress,
  deviceCount = 0,
  temperature,
  humidity
}: RoomCardProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.9)']}
        style={styles.card}
      >
        {/* Thumbnail Preview Area */}
        <View style={styles.thumbnail}>
          <LinearGradient
            colors={['rgba(77, 123, 254, 0.2)', 'rgba(99, 102, 241, 0.1)']}
            style={styles.thumbnailGradient}
          >
            <Home size={32} color="#4D7BFE" strokeWidth={2} />
          </LinearGradient>
        </View>

        {/* Room Info */}
        <View style={styles.info}>
          {/* Room Name */}
          <Text style={styles.roomName} numberOfLines={1}>
            {room.name}
          </Text>

          {/* Device Count Badge */}
          <View style={styles.deviceBadge}>
            <View style={styles.deviceDot} />
            <Text style={styles.deviceCount}>
              {deviceCount} {deviceCount === 1 ? 'device' : 'devices'}
            </Text>
          </View>

          {/* Environmental Data */}
          {(temperature !== undefined || humidity !== undefined) && (
            <View style={styles.envData}>
              {temperature !== undefined && (
                <View style={styles.envItem}>
                  <Thermometer size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.envText}>{temperature}°C</Text>
                </View>
              )}
              {humidity !== undefined && (
                <View style={styles.envItem}>
                  <Droplets size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.envText}>{humidity}%</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadows.lg,
  },
  thumbnail: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  roomName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  deviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4D7BFE',
  },
  deviceCount: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  envData: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  envItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  envText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
});