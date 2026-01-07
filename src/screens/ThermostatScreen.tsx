import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
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
  Calendar,
  Settings,
  ArrowLeft
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import CircularThermostat from '../components/CircularThermostat';
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

  const handleFanCycle = async () => {
    if (!thermostat) return;
    const fanOrder: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const currentIndex = fanOrder.indexOf(fanSpeed);
    const nextSpeed = fanOrder[(currentIndex + 1) % fanOrder.length];
    setFanSpeed(nextSpeed);
    try {
      await controlDevice(thermostat.id, { fanSpeed: nextSpeed });
    } catch (e) {
      // ignore
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={gradients.deepPurple || gradients.background}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={gradients.deepPurple || gradients.background}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Thermostat</Text>
            <Text style={styles.headerSubtitle}>Living Room</Text>
          </View>
          <View style={styles.weatherInfo}>
            <View style={styles.weatherRow}>
              <Thermometer size={14} color={colors.mutedForeground} />
              <Text style={styles.weatherText}>21°C</Text>
            </View>
            <View style={styles.weatherRow}>
              <Droplets size={14} color={colors.mutedForeground} />
              <Text style={styles.weatherText}>
                {typeof thermostat?.humidity === 'number' ? `${thermostat.humidity}%` : '58%'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Thermostat Dial */}
          <View style={styles.dialWrapper}>
            <CircularThermostat
              temperature={temperature}
              mode={mode}
              minTemp={16}
              maxTemp={30}
              radius={140}
            />

            {/* Plus/Minus Overlay Controls */}
            <View style={styles.tempControls}>
              <TouchableOpacity onPress={() => adjustTemperature(-1)} style={styles.tempButton}>
                <Minus size={24} color="white" />
              </TouchableOpacity>
              <View style={{ width: 100 }} />
              <TouchableOpacity onPress={() => adjustTemperature(1)} style={styles.tempButton}>
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Tabs */}
          <View style={styles.modeTabs}>
            {['Off', 'Manual', 'Auto'].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  if (m === 'Off') {
                    // handle off
                  } else if (m === 'Auto') {
                    handleModeChange('auto');
                  } else {
                    handleModeChange(mode === 'auto' ? 'cool' : mode);
                  }
                }}
              >
                <Text style={[
                  styles.modeTabText,
                  (m === 'Manual' && mode !== 'auto') || (m === 'Auto' && mode === 'auto') ? styles.modeTabActive : {}
                ]}>{m}</Text>
                {((m === 'Manual' && mode !== 'auto') || (m === 'Auto' && mode === 'auto')) && <View style={styles.activeDot} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.actionButton, mode === 'cool' && styles.actionButtonActive]}
              onPress={() => handleModeChange('cool')}
            >
              <View style={styles.actionIconBubble}>
                <Snowflake size={24} color={mode === 'cool' ? '#00C2FF' : colors.mutedForeground} />
              </View>
              <Text style={styles.actionLabel}>Cooling</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleFanCycle}
            >
              <View style={styles.actionIconBubble}>
                <Fan size={24} color={colors.mutedForeground} />
                {/* Fan Speed Indicator */}
                <View style={styles.fanIndicator}>
                  <Text style={{ color: colors.primary, fontSize: 8, fontWeight: 'bold' }}>
                    {fanSpeed.toUpperCase().charAt(0)}
                  </Text>
                </View>
              </View>
              <Text style={styles.actionLabel}>Fan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Schedules')}
            >
              <View style={styles.actionIconBubble}>
                <Calendar size={24} color={colors.mutedForeground} />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  weatherInfo: {
    alignItems: 'flex-end',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    paddingBottom: spacing.xl,
  },
  dialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl * 2,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  tempControls: {
    flexDirection: 'row',
    position: 'absolute',
    top: '50%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24, // adjust for button height
  },
  tempButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  modeTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '500',
  },
  modeTabActive: {
    color: 'white',
    fontWeight: '600',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neonBlue,
    alignSelf: 'center',
    marginTop: 4,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButtonActive: {
    // scale or glow
  },
  actionIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  actionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  fanIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});