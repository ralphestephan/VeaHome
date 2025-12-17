import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

export default function RoomCard({ room, onPress }: RoomCardProps) {
  const pm25 = typeof room.pm25 === 'number' ? room.pm25 : undefined;
  const mq2 = typeof room.mq2 === 'number' ? room.mq2 : undefined;

  // Defaults aligned with your ESP32 SmartMonitor sketch
  const PM25_BAD_THRESHOLD = 400;
  const MQ2_BAD_THRESHOLD = 60;

  const reasons: string[] = [];
  if (typeof pm25 === 'number' && pm25 > PM25_BAD_THRESHOLD) reasons.push('PM2.5 high');
  if (typeof mq2 === 'number' && mq2 > MQ2_BAD_THRESHOLD) reasons.push('Gas/Smoke high');
  const airQualityLabel = reasons.length ? `Bad (${reasons.join(', ')})` : 'Good';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: room.image }}
        style={styles.image}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(19, 21, 42, 0.9)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.name}>{room.name}</Text>
              <View style={styles.badge}>
                <MaterialCommunityIcons
                  name="lightbulb"
                  size={12}
                  color="white"
                />
                <Text style={styles.badgeText}>{room.lights}</Text>
              </View>
            </View>
            
            <View style={styles.stats}>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="thermometer"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.statText}>{room.temperature}°C</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="water-percent"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.statText}>{room.humidity}%</Text>
              </View>
              {pm25 !== undefined && (
                <View style={styles.stat}>
                  <MaterialCommunityIcons
                    name="blur"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>PM2.5 {pm25}</Text>
                </View>
              )}
              {mq2 !== undefined && (
                <View style={styles.stat}>
                  <MaterialCommunityIcons
                    name="smoke"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>MQ2 {mq2}</Text>
                </View>
              )}
              {room.airQuality !== undefined && (
                <View style={styles.stat}>
                  <MaterialCommunityIcons
                    name="air-filter"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>AQI {room.airQuality}</Text>
                </View>
              )}
            </View>

            {(pm25 !== undefined || mq2 !== undefined) && (
              <Text style={styles.airQualityText}>Air quality: {airQualityLabel}</Text>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  image: {
    height: 160,
    width: '100%',
  },
  imageStyle: {
    borderRadius: borderRadius.xxl,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: borderRadius.xxl,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  airQualityText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});