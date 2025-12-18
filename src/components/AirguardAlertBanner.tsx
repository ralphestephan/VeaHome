import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  AlertTriangle, 
  Thermometer, 
  Droplets, 
  Wind, 
  Flame,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize } from '../constants/theme';

export interface AlertInfo {
  hasAlert: boolean;
  reasons: string[];
  alertFlags: number;
}

/**
 * Decode alertFlags bitfield into alert reasons
 * bit0=temp, bit1=humidity, bit2=dust, bit3=mq2
 */
export function decodeAlertFlags(alertFlags: number): string[] {
  const reasons: string[] = [];
  if (alertFlags & 1) reasons.push('Temp');
  if (alertFlags & 2) reasons.push('Humidity');
  if (alertFlags & 4) reasons.push('Dust');
  if (alertFlags & 8) reasons.push('Gas');
  return reasons;
}

/**
 * Get alert info from alertFlags from the backend
 * The backend is the source of truth for alerts - it tracks violations over time
 */
export function getAlertInfo(
  alertFlags?: number,
  sensorData?: {
    temperature?: number;
    humidity?: number;
    dust?: number;
    mq2?: number;
  },
  thresholds?: {
    tempHigh?: number;
    tempLow?: number;
    humidityHigh?: number;
    humidityLow?: number;
    dustHigh?: number;
    mq2High?: number;
  }
): AlertInfo {
  // Use the backend's alertFlags as the source of truth
  // The device/backend maintains alert state even if current readings are normal
  const flags = alertFlags ?? 0;
  const reasons = decodeAlertFlags(flags);
  
  const result = { hasAlert: reasons.length > 0, reasons, alertFlags: flags };
  console.log('[getAlertInfo] Using backend alertFlags:', flags, 'Reasons:', reasons, 'Current sensor data:', sensorData);
  
  return result;
}

interface AirguardAlertBannerProps {
  alertFlags?: number;
  sensorData?: {
    temperature?: number;
    humidity?: number;
    dust?: number;
    mq2?: number;
  };
  thresholds?: {
    tempHigh?: number;
    tempLow?: number;
    humidityHigh?: number;
    humidityLow?: number;
    dustHigh?: number;
    mq2High?: number;
  };
  variant?: 'full' | 'compact' | 'badge';
  showOkStatus?: boolean;
}

const alertIcons: Record<string, React.ElementType> = {
  Temp: Thermometer,
  Humidity: Droplets,
  Dust: Wind,
  Gas: Flame,
};

const alertColors: Record<string, string> = {
  Temp: '#FF6B6B',
  Humidity: '#4FC3F7',
  Dust: '#FFB74D',
  Gas: '#FF5252',
};

export default function AirguardAlertBanner({
  alertFlags,
  sensorData,
  thresholds,
  variant = 'full',
  showOkStatus = false,
}: AirguardAlertBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const alertInfo = getAlertInfo(alertFlags, sensorData, thresholds);
  
  if (!alertInfo.hasAlert) {
    if (!showOkStatus) return null;
    
    // Show OK status
    if (variant === 'badge') {
      return (
        <View style={[styles.badge, styles.badgeOk]}>
          <CheckCircle size={12} color="#4CAF50" />
          <Text style={[styles.badgeText, { color: '#4CAF50' }]}>OK</Text>
        </View>
      );
    }
    
    return (
      <View style={[styles.bannerOk, variant === 'compact' && styles.bannerCompact]}>
        <CheckCircle size={16} color="#4CAF50" />
        <Text style={styles.okText}>All sensors normal</Text>
      </View>
    );
  }
  
  // Badge variant - minimal
  if (variant === 'badge') {
    return (
      <View style={styles.badge}>
        <AlertTriangle size={12} color="#fff" />
        <Text style={styles.badgeText}>{alertInfo.reasons.join(', ')}</Text>
      </View>
    );
  }
  
  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <View style={[styles.banner, styles.bannerCompact]}>
        <AlertTriangle size={14} color="#fff" />
        <Text style={styles.bannerTextCompact}>
          Alert: {alertInfo.reasons.join(', ')}
        </Text>
      </View>
    );
  }
  
  // Full variant - with icons for each alert type
  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8E53']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}
    >
      <View style={styles.bannerHeader}>
        <AlertTriangle size={18} color="#fff" />
        <Text style={styles.bannerTitle}>Alert Active</Text>
      </View>
      <View style={styles.alertItems}>
        {alertInfo.reasons.map((reason) => {
          const IconComponent = alertIcons[reason] || AlertTriangle;
          return (
            <View key={reason} style={styles.alertItem}>
              <View style={[styles.alertIconBg, { backgroundColor: alertColors[reason] + '40' }]}>
                <IconComponent size={14} color="#fff" />
              </View>
              <Text style={styles.alertItemText}>{reason}</Text>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  banner: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FF6B6B',
  },
  bannerOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  bannerTextCompact: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  okText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#4CAF50',
  },
  alertItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  alertIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertItemText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  badgeOk: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});
