import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Droplets,
  Power,
  Plus,
  Minus,
  Gauge,
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { publishAirguardCommand } from '../services/airguardMqtt';
import { useToast } from '../components/Toast';

type Props = {
  route: RouteProp<RootStackParamList, 'DehumidifierControl'>;
};

export default function DehumidifierControlScreen({ route }: Props) {
  const navigation = useNavigation();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const { deviceId, airguardDeviceId } = route.params;
  const [power, setPower] = useState(false);
  const [level, setLevel] = useState(3); // 1-5
  const [loading, setLoading] = useState(false);

  const getToken = async () => token || null;

  const adjustLevel = (delta: number) => {
    const newLevel = Math.max(1, Math.min(5, level + delta));
    setLevel(newLevel);
    if (power) {
      sendCommand({ level: newLevel });
    }
  };

  const handlePowerToggle = () => {
    const newPower = !power;
    setPower(newPower);
    sendCommand({ power: newPower ? 'ON' : 'OFF', level: newPower ? level : 0 });
  };

  const sendCommand = async (updates: { power?: 'ON' | 'OFF'; level?: number }) => {
    setLoading(true);
    try {
      const command = {
        power: updates.power !== undefined ? updates.power : (power ? 'ON' : 'OFF'),
        level: updates.level !== undefined ? updates.level : level,
      };

      await publishAirguardCommand(airguardDeviceId, 'dehumidifier', command, getToken);
      showToast('Dehumidifier command sent', 'success');
    } catch (error: any) {
      console.error('[DehumidifierControl] Failed to send command:', error);
      Alert.alert('Error', error.message || 'Failed to send dehumidifier command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Dehumidifier Control" showBack />
      
      <View style={styles.content}>
        {/* Large Icon Display */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={gradients.accent}
            style={styles.iconGradient}
          >
            <Droplets size={80} color="#fff" />
          </LinearGradient>
        </View>

        {/* Level Display */}
        <View style={styles.levelDisplay}>
          <View style={styles.levelContainer}>
            <LinearGradient
              colors={power ? gradients.accent : [colors.muted, colors.muted]}
              style={styles.levelDial}
            >
              <Text style={styles.levelValue}>{level}</Text>
              <Text style={styles.levelLabel}>Level</Text>
            </LinearGradient>
          </View>

          <View style={styles.levelControls}>
            <TouchableOpacity
              onPress={() => adjustLevel(-1)}
              activeOpacity={0.85}
              disabled={loading || !power}
            >
              <LinearGradient
                colors={gradients.card}
                style={styles.levelButton}
              >
                <Minus size={24} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => adjustLevel(1)}
              activeOpacity={0.85}
              disabled={loading || !power}
            >
              <LinearGradient
                colors={gradients.card}
                style={styles.levelButton}
              >
                <Plus size={24} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Indicators */}
        <View style={styles.levelIndicators}>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <View
              key={lvl}
              style={[
                styles.levelIndicator,
                lvl <= level && power && styles.levelIndicatorActive,
              ]}
            >
              <View
                style={[
                  styles.levelIndicatorBar,
                  lvl <= level && power && styles.levelIndicatorBarActive,
                  { height: `${lvl * 20}%` },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Gauge size={20} color={colors.primary} />
            <View>
              <Text style={styles.statusLabel}>Current Level</Text>
              <Text style={styles.statusValue}>
                {power ? `Level ${level}` : 'OFF'}
              </Text>
            </View>
          </View>
        </View>

        {/* Power Button */}
        <TouchableOpacity
          onPress={handlePowerToggle}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.powerButton}
        >
          <LinearGradient
            colors={power ? gradients.accent : [colors.muted, colors.muted]}
            style={styles.powerButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Power size={24} color="#fff" />
                <Text style={styles.powerButtonText}>{power ? 'ON' : 'OFF'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  levelDisplay: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  levelContainer: {
    marginBottom: spacing.xl,
  },
  levelDial: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  levelValue: {
    fontSize: 64,
    fontWeight: '700',
    color: 'white',
  },
  levelLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: -8,
  },
  levelControls: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  levelButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 60,
    alignItems: 'flex-end',
  },
  levelIndicator: {
    width: 30,
    height: 50,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  levelIndicatorActive: {
    borderColor: colors.primary,
  },
  levelIndicatorBar: {
    width: '100%',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
  },
  levelIndicatorBarActive: {
    backgroundColor: colors.primary,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  powerButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  powerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  powerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

