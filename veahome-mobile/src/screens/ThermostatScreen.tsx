import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

type Props = {
  route: RouteProp<RootStackParamList, 'Thermostat'>;
};

export default function ThermostatScreen({ route }: Props) {
  const [temperature, setTemperature] = useState(24);
  const [mode, setMode] = useState<'cool' | 'heat' | 'auto'>('cool');

  const adjustTemperature = (delta: number) => {
    setTemperature(prev => Math.max(16, Math.min(30, prev + delta)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Thermostat Control" showBack />
      
      <View style={styles.content}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'cool' && styles.activeModeButton]}
            onPress={() => setMode('cool')}
          >
            <Snowflake
              size={20}
              color={mode === 'cool' ? 'white' : colors.primary}
            />
            <Text style={[styles.modeText, mode === 'cool' && styles.activeModeText]}>
              Cool
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeButton, mode === 'heat' && styles.activeModeButton]}
            onPress={() => setMode('heat')}
          >
            <Flame
              size={20}
              color={mode === 'heat' ? 'white' : colors.primary}
            />
            <Text style={[styles.modeText, mode === 'heat' && styles.activeModeText]}>
              Heat
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.modeButton, mode === 'auto' && styles.activeModeButton]}
            onPress={() => setMode('auto')}
          >
            <RotateCcw
              size={20}
              color={mode === 'auto' ? 'white' : colors.primary}
            />
            <Text style={[styles.modeText, mode === 'auto' && styles.activeModeText]}>
              Auto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Temperature Display */}
        <View style={styles.temperatureDisplay}>
          <View style={styles.dialContainer}>
            <View style={styles.dial}>
              <Text style={styles.tempValue}>{temperature}</Text>
              <Text style={styles.tempUnit}>°C</Text>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => adjustTemperature(1)}
            >
              <Plus size={32} color={colors.foreground} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => adjustTemperature(-1)}
            >
              <Minus size={32} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Thermometer
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Current Temperature</Text>
              <Text style={styles.statusValue}>22°C</Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Droplets
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Humidity</Text>
              <Text style={styles.statusValue}>58%</Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Fan
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.statusLabel}>Fan Speed</Text>
              <Text style={styles.statusValue}>Medium</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Power size={24} color={colors.primary} />
            <Text style={styles.actionText}>Power</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Fan size={24} color={colors.primary} />
            <Text style={styles.actionText}>Fan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Timer size={24} color={colors.primary} />
            <Text style={styles.actionText}>Timer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Settings size={24} color={colors.primary} />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
    marginBottom: spacing.xl,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  activeModeButton: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: 12,
    color: colors.foreground,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
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
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 11,
    color: colors.foreground,
  },
});