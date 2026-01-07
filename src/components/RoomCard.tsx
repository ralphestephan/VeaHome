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
import { decodeAlertFlags } from './AirguardAlertBanner';

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

  // Use alertFlags from device telemetry if available (bitfield: 1=temp, 2=hum, 4=dust, 8=mq2)
  const alertFlags = (room as any).alertFlags ?? 0;
  const alertReasons = decodeAlertFlags(alertFlags);

  // Device alert from Node-RED or alertFlags
  const deviceAlert = room.alert === true;
  const isAlert = alertReasons.length > 0 || deviceAlert;

  // Air quality (dust/gas only) - use bitwise check on alertFlags
  const hasAirSensors = pm25 !== undefined || mq2 !== undefined;
  const isAirBad = (alertFlags & 4) !== 0 || (alertFlags & 8) !== 0;

  // Get alert icon based on type
  const getAlertIcon = (): any => {
    if (alertReasons.includes('Gas')) return 'fire-alert';
    if (alertReasons.includes('Dust')) return 'weather-cloudy-alert';
    if (alertReasons.includes('Temp')) return 'thermometer-alert';
    if (alertReasons.includes('Humidity')) return 'water-alert';
    return 'alert';
  };

  // Alert badge component for top-left
  const renderAlertBadge = () => {
    if (!isAlert) return null;

    return (
      <View style={styles.alertBadge}>
        <MaterialCommunityIcons name={getAlertIcon()} size={14} color="#fff" />
        <Text style={styles.alertBadgeText}>
          {alertReasons.length > 0 ? alertReasons.join(' · ') : 'Alert'}
        </Text>
      </View>
    );
  };

  const renderStats = () => (
    <>
      {showTempHum && (
        <View style={styles.stats}>
          <View style={[styles.stat, alertReasons.includes('Temp') && styles.statAlert]}>
            <MaterialCommunityIcons
              name={alertReasons.includes('Temp') ? 'thermometer-alert' : 'thermometer'}
              size={14}
              color={alertReasons.includes('Temp') ? '#FF6B6B' : colors.primary}
            />
            <Text style={[styles.statText, alertReasons.includes('Temp') && styles.statTextAlert]}>
              {temperatureText}
            </Text>
          </View>
          <View style={[styles.stat, alertReasons.includes('Humidity') && styles.statAlert]}>
            <MaterialCommunityIcons
              name={alertReasons.includes('Humidity') ? 'water-alert' : 'water-percent'}
              size={14}
              color={alertReasons.includes('Humidity') ? '#FF6B6B' : colors.primary}
            />
            <Text style={[styles.statText, alertReasons.includes('Humidity') && styles.statTextAlert]}>
              {humidityText}
            </Text>
          </View>
        </View>
      )}
      {/* Air quality display */}
      {hasAirSensors && (
        <View style={styles.airStatusRow}>
          {alertReasons.includes('Dust') && (
            <View style={styles.airAlertChip}>
              <MaterialCommunityIcons name="weather-cloudy-alert" size={12} color="#FF6B6B" />
              <Text style={styles.airAlertText}>Dust</Text>
            </View>
          )}
          {alertReasons.includes('Gas') && (
            <View style={styles.airAlertChip}>
              <MaterialCommunityIcons name="fire-alert" size={12} color="#FF6B6B" />
              <Text style={styles.airAlertText}>Gas</Text>
            </View>
          )}
          {!isAirBad && (
            <View style={styles.airOkChip}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#4CAF50" />
              <Text style={styles.airOkText}>Air OK</Text>
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {room.image ? (
        <ImageBackground
          source={{ uri: room.image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          {renderAlertBadge()}
          <LinearGradient
            colors={['rgba(26, 15, 46, 0.3)', 'rgba(6, 8, 22, 0.95)']} // Updated for luxurious dark gradient
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
            colors={['rgba(26, 15, 46, 0.6)', 'rgba(6, 8, 22, 0.95)']}
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
    height: 180, // Increased for better prominence
    width: '100%',
    position: 'relative',
  },
  imageStyle: {
    borderRadius: borderRadius.xxl,
  },
  alertBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: '#FF6B6B',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: borderRadius.xxl,
  },
  content: {
    padding: spacing.lg, // Increased padding for better spacing
    gap: spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 20, // Slightly larger for premium feel
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Frosted glass
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Frosted glass effect
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  statAlert: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
  },
  statTextAlert: {
    color: '#FF6B6B',
  },
  airStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flexWrap: 'wrap',
  },
  airAlertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  airAlertText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  airOkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  airOkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
  },
});