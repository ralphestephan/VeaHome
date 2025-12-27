import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Thermometer,
  Droplets,
  Lightbulb,
  Zap,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { Room } from '../types';
import AirguardAlertBanner, { decodeAlertFlags } from './AirguardAlertBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RoomPopupCardProps {
  room: Room | null;
  visible: boolean;
  onClose: () => void;
  onViewDetails: (roomId: string) => void;
}

export default function RoomPopupCard({
  room,
  visible,
  onClose,
  onViewDetails,
}: RoomPopupCardProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    if (visible && room) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(20);
    }
  }, [visible, room]);
  
  if (!visible) return null;
  
  // If room is null, don't show popup (wait for data)
  if (!room) {
    console.log('[RoomPopupCard] Room is null, not showing popup');
    return null;
  }
  
  const deviceCount = Array.isArray(room.devices) ? room.devices.length : 0;
  const alertFlags = (room as any).alertFlags ?? 0;
  const alertReasons = decodeAlertFlags(alertFlags);
  const hasAlert = alertReasons.length > 0 || room.alert === true;
  
  const temperatureText = typeof room.temperature === 'number' && Number.isFinite(room.temperature)
    ? `${room.temperature.toFixed(1)}°C`
    : '—';
  const humidityText = typeof room.humidity === 'number' && Number.isFinite(room.humidity)
    ? `${Math.round(room.humidity)}%`
    : '—';
  
  const handleViewDetails = () => {
    onClose();
    setTimeout(() => onViewDetails(room.id), 150);
  };
  
  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      />
      
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.card, colors.cardAlt]}
          style={styles.card}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          
          {/* Room Image Header */}
          <View style={styles.imageContainer}>
            {room.image ? (
              <Image source={{ uri: room.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, { backgroundColor: colors.muted }]} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            >
              <View style={styles.imageContent}>
                <View>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomScene}>
                    {room.sceneName || (typeof room.scene === 'object' ? (room.scene as any)?.name : null) || 'No Scene'}
                  </Text>
                </View>
                <View style={styles.deviceBadge}>
                  <Lightbulb size={12} color="#fff" />
                  <Text style={styles.deviceBadgeText}>{deviceCount} devices</Text>
                </View>
              </View>
            </LinearGradient>
            
            {/* Alert Badge */}
            {hasAlert && (
              <View style={styles.alertBadge}>
                <AlertTriangle size={14} color="#fff" />
                <Text style={styles.alertBadgeText}>
                  {alertReasons.length > 0 ? alertReasons.join(', ') : 'Alert'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, alertReasons.includes('Temp') && styles.metricCardAlert]}>
              <Thermometer size={18} color={alertReasons.includes('Temp') ? '#FF6B6B' : colors.primary} />
              <Text style={[styles.metricValue, alertReasons.includes('Temp') && styles.metricValueAlert]}>
                {temperatureText}
              </Text>
              <Text style={styles.metricLabel}>Temperature</Text>
            </View>
            
            <View style={[styles.metricCard, alertReasons.includes('Humidity') && styles.metricCardAlert]}>
              <Droplets size={18} color={alertReasons.includes('Humidity') ? '#FF6B6B' : colors.primary} />
              <Text style={[styles.metricValue, alertReasons.includes('Humidity') && styles.metricValueAlert]}>
                {humidityText}
              </Text>
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Lightbulb size={18} color={colors.primary} />
              <Text style={styles.metricValue}>{room.lights ?? 0}</Text>
              <Text style={styles.metricLabel}>Lights</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Zap size={18} color={colors.primary} />
              <Text style={styles.metricValue}>{room.power || '0kW'}</Text>
              <Text style={styles.metricLabel}>Power</Text>
            </View>
          </View>
          
          {/* Air Quality Alert Banner */}
          {(alertReasons.includes('Dust') || alertReasons.includes('Gas')) && (
            <View style={styles.airQualityAlert}>
              <AlertTriangle size={14} color="#FF6B6B" />
              <Text style={styles.airQualityAlertText}>
                Air Quality Alert: {alertReasons.filter(r => r === 'Dust' || r === 'Gas').join(', ')}
              </Text>
            </View>
          )}
          
          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={handleViewDetails}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.neonCyan || colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewDetailsGradient}
            >
              <Text style={styles.viewDetailsText}>View Room Details</Text>
              <ChevronRight size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  cardContainer: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  card: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows?.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  imageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  roomName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  roomScene: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  deviceBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  alertBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  metricCardAlert: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  metricValueAlert: {
    color: '#FF6B6B',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  airQualityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  airQualityAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  viewDetailsButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  viewDetailsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  viewDetailsText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});
