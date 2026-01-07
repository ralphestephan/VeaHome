import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Snowflake,
  Flame,
  RotateCcw,
  Plus,
  Minus,
  Thermometer,
  Droplets,
  Fan,
  Power,
  Timer,
  Settings,
  Wind,
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { getApiClient, PublicAirguardApi } from '../services/api';
import { useToast } from '../components/Toast';
import { publishAirguardCommand } from '../services/airguardMqtt';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  route: RouteProp<RootStackParamList, 'ACControl'>;
};

export default function ACControlScreen({ route }: Props) {
  const navigation = useNavigation();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token } = useAuth();
  const { showToast } = useToast();

  const getToken = async () => token || null;

  const { deviceId, airguardDeviceId } = route.params;
  const [temperature, setTemperature] = useState(24);
  const [mode, setMode] = useState<'COOL' | 'HEAT' | 'AUTO' | 'FAN'>('COOL');
  const [power, setPower] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);

  // Fetch current room temperature from AirGuard
  useEffect(() => {
    if (!airguardDeviceId || !token) return;

    const fetchRoomData = async () => {
      try {
        const client = getApiClient(async () => token);
        const airguardApi = PublicAirguardApi(client);
        const response = await airguardApi.getLatest(airguardDeviceId);
        const data = (response as any)?.data?.data?.data || (response as any)?.data?.data || (response as any)?.data;

        if (data?.temperature != null) {
          setCurrentTemp(data.temperature);
        }
        if (data?.humidity != null) {
          setCurrentHumidity(data.humidity);
        }
      } catch (error) {
        console.error('[ACControl] Failed to fetch room data:', error);
      }
    };

    fetchRoomData();
    const interval = setInterval(fetchRoomData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [airguardDeviceId, token]);

  const adjustTemperature = (delta: number) => {
    const newTemp = Math.max(16, Math.min(30, temperature + delta));
    setTemperature(newTemp);
    if (power) {
      sendCommand({ temp: newTemp });
    }
  };

  const handleModeChange = (newMode: 'COOL' | 'HEAT' | 'AUTO' | 'FAN') => {
    setMode(newMode);
    if (power) {
      sendCommand({ mode: newMode });
    }
  };

  const handlePowerToggle = () => {
    const newPower = !power;
    setPower(newPower);
    sendCommand({ power: newPower ? 'ON' : 'OFF' });
  };

  const sendCommand = async (updates: { power?: 'ON' | 'OFF'; temp?: number; mode?: string }) => {
    setLoading(true);
    try {
      const command = {
        power: updates.power !== undefined ? updates.power : (power ? 'ON' : 'OFF'),
        temp: updates.temp !== undefined ? updates.temp : temperature,
        mode: updates.mode !== undefined ? updates.mode : mode,
      };

      await publishAirguardCommand(airguardDeviceId, 'ac', command, getToken);
      showToast('AC command sent', 'success');
    } catch (error: any) {
      console.error('[ACControl] Failed to send command:', error);
      Alert.alert('Error', error.message || 'Failed to send AC command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="AC Control"
        showBack
        rightComponent={
          <View style={styles.headerRight}>
            {currentTemp != null && (
              <View style={styles.headerTemp}>
                <Thermometer size={16} color={colors.mutedForeground} />
                <Text style={styles.headerTempText}>{Math.round(currentTemp)}°C</Text>
              </View>
            )}
            {currentHumidity != null && (
              <View style={styles.headerTemp}>
                <Droplets size={16} color={colors.mutedForeground} />
                <Text style={styles.headerTempText}>{Math.round(currentHumidity)}%</Text>
              </View>
            )}
          </View>
        }
      />

      <View style={styles.content}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {[
            { key: 'COOL' as const, label: 'Cool', Icon: Snowflake },
            { key: 'HEAT' as const, label: 'Heat', Icon: Flame },
            { key: 'AUTO' as const, label: 'Auto', Icon: RotateCcw },
            { key: 'FAN' as const, label: 'Fan', Icon: Wind },
          ].map(({ key, label, Icon }) => {
            const isActive = mode === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.modeButtonWrapper}
                onPress={() => handleModeChange(key)}
                activeOpacity={0.85}
                disabled={loading}
              >
                {isActive ? (
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modeButton}
                  >
                    <Icon size={20} color="white" />
                    <Text style={[styles.modeText, styles.activeModeText]}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.modeButton, styles.modeButtonInactive]}>
                    <Icon size={20} color={colors.primary} />
                    <Text style={styles.modeText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Temperature Display */}
        <View style={styles.temperatureDisplay}>
          <View style={styles.dialContainer}>
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dial}
            >
              <Text style={styles.tempValue}>{temperature}</Text>
              <Text style={styles.tempUnit}>°C</Text>
            </LinearGradient>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={() => adjustTemperature(-1)}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient
                colors={gradients.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.controlButton}
              >
                <Minus size={32} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => adjustTemperature(1)}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient
                colors={gradients.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.controlButton}
              >
                <Plus size={32} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Thermometer size={20} color={colors.primary} />
            <View>
              <Text style={styles.statusLabel}>Room Temperature</Text>
              <Text style={styles.statusValue}>
                {currentTemp != null ? `${Math.round(currentTemp)}°C` : '--'}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Droplets size={20} color={colors.primary} />
            <View>
              <Text style={styles.statusLabel}>Humidity</Text>
              <Text style={styles.statusValue}>
                {currentHumidity != null ? `${Math.round(currentHumidity)}%` : '--'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handlePowerToggle}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={power ? gradients.accent : [colors.muted, colors.muted]}
              style={styles.actionButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Power size={24} color="#fff" />
                  <Text style={styles.actionText}>{power ? 'ON' : 'OFF'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTemp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTempText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.xl,
  },
  modeButtonWrapper: {
    flex: 1,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  modeButtonInactive: {
    backgroundColor: 'transparent',
  },
  modeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  activeModeText: {
    color: 'white',
    fontWeight: '600',
  },
  temperatureDisplay: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dialContainer: {
    marginBottom: spacing.xl,
  },
  dial: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  tempValue: {
    fontSize: 72,
    fontWeight: '700',
    color: 'white',
  },
  tempUnit: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: -8,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    maxWidth: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

