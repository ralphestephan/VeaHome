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
  const deviceCount = Array.isArray(room.devices) ? room.devices.length : 0;

  const showTempHum =
    (typeof room.temperature === 'number' && room.temperature !== 0) ||
    (typeof room.humidity === 'number' && room.humidity !== 0);

  const temperatureText =
    typeof room.temperature === 'number' && Number.isFinite(room.temperature)
      ? `${room.temperature.toFixed(1)}°C`
      : '—';
  const humidityText =
    typeof room.humidity === 'number' && Number.isFinite(room.humidity)
      ? `${Math.round(room.humidity)}%`
      : '—';

  // Thresholds aligned with ESP32 SmartMonitor sketch
  const PM25_BAD_THRESHOLD = 400;
  const MQ2_BAD_THRESHOLD = 60;
  const TEMP_HIGH_THRESHOLD = 35;
  const HUMIDITY_HIGH_THRESHOLD = 80;

  // Collect alert reasons for ANY threshold exceeded
  const alertReasons: string[] = [];
  if (pm25 !== undefined && pm25 > PM25_BAD_THRESHOLD) alertReasons.push('Dust');
  if (mq2 !== undefined && mq2 > MQ2_BAD_THRESHOLD) alertReasons.push('Gas');
  if (typeof room.temperature === 'number' && room.temperature > TEMP_HIGH_THRESHOLD) alertReasons.push('Temp');
  if (typeof room.humidity === 'number' && room.humidity > HUMIDITY_HIGH_THRESHOLD) alertReasons.push('Humidity');

  // Device alert from Node-RED
  const deviceAlert = room.alert === true;
  const isAlert = alertReasons.length > 0 || deviceAlert;

  // Air quality (dust/gas only)
  const hasAirSensors = pm25 !== undefined || mq2 !== undefined;
  const isAirBad = (pm25 !== undefined && pm25 > PM25_BAD_THRESHOLD) || 
                   (mq2 !== undefined && mq2 > MQ2_BAD_THRESHOLD);

  // Alert badge component for top-left
  const renderAlertBadge = () => {
    if (!isAlert) return null;
    return (
      <View style={styles.alertBadge}>
        <MaterialCommunityIcons name="alert" size={14} color="#fff" />
        <Text style={styles.alertBadgeText}>{alertReasons.join(', ') || 'Alert'}</Text>
      </View>
    );
  };

  const renderStats = () => (
    <>
      {showTempHum && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <MaterialCommunityIcons 
              name="thermometer" 
              size={14} 
              color={alertReasons.includes('Temp') ? colors.destructive : colors.primary} 
            />
            <Text style={[styles.statText, alertReasons.includes('Temp') && { color: colors.destructive }]}>
              {temperatureText}
            </Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons 
              name="water-percent" 
              size={14} 
              color={alertReasons.includes('Humidity') ? colors.destructive : colors.primary} 
            />
            <Text style={[styles.statText, alertReasons.includes('Humidity') && { color: colors.destructive }]}>
              {humidityText}
            </Text>
          </View>
        </View>
      )}
      {/* Air quality based on dust/gas only */}
      {hasAirSensors && (
        <View style={styles.airStatusRow}>
          <MaterialCommunityIcons 
            name={isAirBad ? 'weather-cloudy-alert' : 'weather-sunny'} 
            size={14} 
            color={isAirBad ? colors.destructive : colors.primary} 
          />
          <Text style={[styles.airQualityText, isAirBad && { color: colors.destructive }]}>
            Air: {isAirBad ? 'Bad' : 'Good'}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {room.image ? (
        <ImageBackground
          source={{ uri: room.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          {renderAlertBadge()}
          <LinearGradient
            colors={['transparent', 'rgba(19, 21, 42, 0.9)']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.name}>{room.name}</Text>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="devices" size={12} color="white" />
                  <Text style={styles.badgeText}>{deviceCount}</Text>
                </View>
              </View>
              {renderStats()}
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.image, styles.imageStyle, { backgroundColor: colors.card }]}>
          {renderAlertBadge()}
          <LinearGradient
            colors={['rgba(19, 21, 42, 0.4)', 'rgba(19, 21, 42, 0.9)']}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.name}>{room.name}</Text>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="devices" size={12} color="white" />
                  <Text style={styles.badgeText}>{deviceCount}</Text>
                </View>
              </View>
              {renderStats()}
            </View>
          </LinearGradient>
        </View>
      )}
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
    position: 'relative',
  },
  imageStyle: {
    borderRadius: borderRadius.xxl,
  },
  alertBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
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
  airStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});