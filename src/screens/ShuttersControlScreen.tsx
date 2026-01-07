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
  ChevronUp,
  ChevronDown,
  Square,
  Blinds,
  Power,
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
  route: RouteProp<RootStackParamList, 'ShuttersControl'>;
};

export default function ShuttersControlScreen({ route }: Props) {
  const navigation = useNavigation();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const { deviceId, airguardDeviceId } = route.params;
  const [action, setAction] = useState<'OPEN' | 'CLOSE' | 'STOP'>('STOP');
  const [loading, setLoading] = useState(false);

  const getToken = async () => token || null;

  const sendCommand = async (newAction: 'OPEN' | 'CLOSE' | 'STOP') => {
    setLoading(true);
    try {
      setAction(newAction);
      await publishAirguardCommand(airguardDeviceId, 'shutters', { action: newAction }, getToken);
      showToast(`Shutters ${newAction.toLowerCase()}`, 'success');
    } catch (error: any) {
      console.error('[ShuttersControl] Failed to send command:', error);
      Alert.alert('Error', error.message || 'Failed to send shutters command');
      setAction('STOP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Shutters Control" showBack />
      
      <View style={styles.content}>
        {/* Large Icon Display */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={gradients.accent}
            style={styles.iconGradient}
          >
            <Blinds size={80} color="#fff" />
          </LinearGradient>
        </View>

        {/* Status Display */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={[styles.statusValue, action === 'OPEN' && styles.statusOpen, action === 'CLOSE' && styles.statusClose]}>
            {action}
          </Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.openButton, action === 'OPEN' && styles.controlButtonActive]}
            onPress={() => sendCommand('OPEN')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={action === 'OPEN' ? gradients.accent : [colors.card, colors.card]}
              style={styles.controlButtonGradient}
            >
              {loading && action === 'OPEN' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ChevronUp size={32} color={action === 'OPEN' ? '#fff' : colors.foreground} />
                  <Text style={[styles.controlButtonText, action === 'OPEN' && styles.controlButtonTextActive]}>
                    Open
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton, action === 'STOP' && styles.controlButtonActive]}
            onPress={() => sendCommand('STOP')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={action === 'STOP' ? gradients.accent : [colors.card, colors.card]}
              style={styles.controlButtonGradient}
            >
              {loading && action === 'STOP' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Square size={24} color={action === 'STOP' ? '#fff' : colors.foreground} />
                  <Text style={[styles.controlButtonText, action === 'STOP' && styles.controlButtonTextActive]}>
                    Stop
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.closeButton, action === 'CLOSE' && styles.controlButtonActive]}
            onPress={() => sendCommand('CLOSE')}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={action === 'CLOSE' ? gradients.accent : [colors.card, colors.card]}
              style={styles.controlButtonGradient}
            >
              {loading && action === 'CLOSE' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ChevronDown size={32} color={action === 'CLOSE' ? '#fff' : colors.foreground} />
                  <Text style={[styles.controlButtonText, action === 'CLOSE' && styles.controlButtonTextActive]}>
                    Close
                  </Text>
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
    justifyContent: 'center',
    gap: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.foreground,
  },
  statusOpen: {
    color: '#4CAF50',
  },
  statusClose: {
    color: '#FF6B6B',
  },
  controls: {
    gap: spacing.md,
  },
  controlButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  controlButtonActive: {
    ...shadows.lg,
  },
  openButton: {
    // Specific styling if needed
  },
  stopButton: {
    // Specific styling if needed
  },
  closeButton: {
    // Specific styling if needed
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  controlButtonTextActive: {
    color: '#fff',
  },
});

