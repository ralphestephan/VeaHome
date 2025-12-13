import React, { useState, useEffect, useMemo } from 'react';
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
  Settings 
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { getApiClient, HubApi } from '../services/api';

type Props = {
  route: RouteProp<RootStackParamList, 'Thermostat'>;
};

export default function ThermostatScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token, user } = useAuth();
  const homeId = user?.homeId;
  const thermostatId = route.params?.deviceId;
  const [temperature, setTemperature] = useState(24);
  const [mode, setMode] = useState<'cool' | 'heat' | 'auto'>('cool');
  const [thermostat, setThermostat] = useState<any | null>(null);
  const [fanSpeed, setFanSpeed] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);
  const { controlDevice, toggleDevice } = useDeviceControl();
  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);

  useEffect(() => {
    if (homeId && thermostatId) {
      loadThermostat(thermostatId);
    } else {
      setLoading(false);
    }
  }, [homeId, thermostatId]);

  const loadThermostat = async (deviceId: string) => {
    if (!homeId) return;
    try {
      setLoading(true);
      const response = await hubApi.getDevice(homeId, deviceId);
      const device = response.data;
      setThermostat(device);
      if (typeof device?.value === 'number') {
        setTemperature(device.value);
      }
      if (device?.mode === 'cool' || device?.mode === 'heat' || device?.mode === 'auto') {
        setMode(device.mode);
      }
      if (typeof device?.fanSpeed === 'string') {
        const speed = device.fanSpeed.toLowerCase();
        if (speed === 'low' || speed === 'medium' || speed === 'high') {
          setFanSpeed(speed);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load thermostat details.');
    } finally {
      setLoading(false);
    }
  };

  const adjustTemperature = async (delta: number) => {
    const next = Math.max(16, Math.min(30, temperature + delta));
    setTemperature(next);
    if (!thermostat) return;
    try {
      await controlDevice(thermostat.id, { value: next, unit: thermostat.unit || '°C' });
      await loadThermostat(thermostat.id);
    } catch (e) {
      Alert.alert('Error', 'Unable to update thermostat temperature.');
    }
  };

  const handleModeChange = async (nextMode: 'cool' | 'heat' | 'auto') => {
    setMode(nextMode);
    if (!thermostat) return;
    try {
      await controlDevice(thermostat.id, { mode: nextMode });
      await loadThermostat(thermostat.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to change thermostat mode.');
    }
  };

  const handlePowerToggle = async () => {
    if (!thermostat) {
      Alert.alert('No Device', 'Pair a thermostat to control its power state.');
      return;
    }
    try {
      await toggleDevice(thermostat.id, thermostat.isActive);
      await loadThermostat(thermostat.id);
    } catch (e) {
      Alert.alert('Error', 'Unable to toggle thermostat power.');
    }
  };

  const handleFanCycle = async () => {
    if (!thermostat) {
      Alert.alert('No Device', 'Pair a thermostat to adjust its fan speed.');
      return;
    }
    const fanOrder: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const currentIndex = fanOrder.indexOf(fanSpeed);
    const nextSpeed = fanOrder[(currentIndex + 1) % fanOrder.length];
    setFanSpeed(nextSpeed);
    try {
      await controlDevice(thermostat.id, { fanSpeed: nextSpeed });
    } catch (e) {
      Alert.alert('Error', 'Failed to update fan speed.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Thermostat Control" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading thermostat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!thermostatId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Thermostat Control" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Select a thermostat from a room to manage it here.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Thermostat Control" showBack />
      
      <View style={styles.content}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {[
            { key: 'cool' as const, label: 'Cool', Icon: Snowflake },
            { key: 'heat' as const, label: 'Heat', Icon: Flame },
            { key: 'auto' as const, label: 'Auto', Icon: RotateCcw },
          ].map(({ key, label, Icon }) => {
            const isActive = mode === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.modeButtonWrapper}
                onPress={() => handleModeChange(key)}
                activeOpacity={0.85}
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
            <TouchableOpacity onPress={() => adjustTemperature(1)} activeOpacity={0.85}>
              <LinearGradient
                colors={gradients.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.controlButton}
              >
                <Plus size={32} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => adjustTemperature(-1)} activeOpacity={0.85}>
              <LinearGradient
                colors={gradients.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.controlButton}
              >
                <Minus size={32} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Status */}
        <GlassCard style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Thermometer
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Current Temperature</Text>
              <Text style={styles.statusValue}>{temperature}°C</Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Droplets
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Humidity</Text>
              <Text style={styles.statusValue}>
                {typeof thermostat?.humidity === 'number' ? `${thermostat.humidity}%` : '58%'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Fan
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Fan Speed</Text>
              <Text style={styles.statusValue}>{fanSpeed.charAt(0).toUpperCase() + fanSpeed.slice(1)}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <GlassCard onPress={handlePowerToggle} containerStyle={styles.actionButton} style={styles.actionButtonSurface}>
            <Power size={24} color={colors.primary} />
            <Text style={styles.actionText}>Power</Text>
          </GlassCard>
          
          <GlassCard onPress={handleFanCycle} containerStyle={styles.actionButton} style={styles.actionButtonSurface}>
            <Fan size={24} color={colors.primary} />
            <Text style={styles.actionText}>Fan</Text>
          </GlassCard>
          
          <GlassCard
            onPress={() => navigation.navigate('Schedules')}
            containerStyle={styles.actionButton}
            style={styles.actionButtonSurface}
          >
            <Timer size={24} color={colors.primary} />
            <Text style={styles.actionText}>Timer</Text>
          </GlassCard>
          
          <GlassCard
            onPress={() => {
              if (thermostat?.id) {
                navigation.navigate('DeviceHistory', { deviceId: thermostat.id });
              } else {
                Alert.alert('No Device', 'Pair a thermostat to view its history.');
              }
            }}
            containerStyle={styles.actionButton}
            style={styles.actionButtonSurface}
          >
            <Settings size={24} color={colors.primary} />
            <Text style={styles.actionText}>Settings</Text>
          </GlassCard>
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
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonSurface: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  actionText: {
    fontSize: 11,
    color: colors.foreground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});