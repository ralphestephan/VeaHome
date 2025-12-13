import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Home, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Lightbulb, 
  ChevronDown,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import StatusBadge from './ui/StatusBadge';

interface HomeStatusBarProps {
  /** Current home name */
  homeName: string;
  /** Whether connected to cloud */
  isOnline?: boolean;
  /** Number of connected hubs */
  hubCount?: number;
  /** Total device count */
  deviceCount?: number;
  /** Number of active devices */
  activeDeviceCount?: number;
  /** Current energy usage */
  currentEnergy?: string;
  /** Handler for home selector */
  onHomeSelect?: () => void;
  /** Handler for status details */
  onStatusPress?: () => void;
}

/**
 * HomeStatusBar - Dashboard top status bar showing home overview
 * Displays connection status, hub count, device count, and quick stats
 */
export default function HomeStatusBar({
  homeName,
  isOnline = true,
  hubCount = 0,
  deviceCount = 0,
  activeDeviceCount = 0,
  currentEnergy,
  onHomeSelect,
  onStatusPress,
}: HomeStatusBarProps) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);

  return (
    <View style={styles.container}>
      {/* Home selector */}
      <TouchableOpacity 
        style={styles.homeSelector} 
        onPress={onHomeSelect}
        activeOpacity={0.7}
      >
        <View style={styles.homeIcon}>
          <Home size={18} color={colors.primary} />
        </View>
        <View style={styles.homeInfo}>
          <Text style={styles.homeName} numberOfLines={1}>{homeName}</Text>
          <View style={styles.statusRow}>
            <StatusBadge 
              variant={isOnline ? 'online' : 'offline'} 
              size="sm"
              pulse={isOnline}
            />
          </View>
        </View>
        <ChevronDown size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Quick stats */}
      <TouchableOpacity 
        style={styles.statsContainer} 
        onPress={onStatusPress}
        activeOpacity={0.7}
      >
        <View style={styles.statItem}>
          <Cpu size={14} color={colors.neonBlue} />
          <Text style={styles.statValue}>{hubCount}</Text>
          <Text style={styles.statLabel}>Hubs</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Lightbulb size={14} color={colors.warning} />
          <Text style={styles.statValue}>{activeDeviceCount}/{deviceCount}</Text>
          <Text style={styles.statLabel}>Devices</Text>
        </View>
        
        {currentEnergy && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Zap size={14} color={colors.success} />
              <Text style={styles.statValue}>{currentEnergy}</Text>
              <Text style={styles.statLabel}>Now</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  homeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  homeIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeInfo: {
    flex: 1,
  },
  homeName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    display: 'none', // Hidden on mobile, could show on larger screens
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
});
