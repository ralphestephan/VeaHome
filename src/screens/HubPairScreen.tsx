import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getApiClient, HubApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HubPairScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const { token, user, refreshMe } = useAuth();
  const client = getApiClient(async () => token);
  const hub = HubApi(client);

  const pairHubWithCode = async (code: string) => {
    try {
      const homeId = user?.homeId;
      if (!homeId) {
        Alert.alert('Missing Home', 'Please create/select a home first, then try pairing again.');
        throw new Error('Missing homeId');
      }
      const response = await hub.pairHub(code, homeId);
      await refreshMe();

      const payload = (response.data as any)?.data ?? response.data;
      const hubId = payload?.hubId || payload?.id;
      if (!hubId) {
        throw new Error('Hub pairing succeeded but returned no hubId');
      }
      navigation.replace('HubSetup', {
        hubId,
        qrCode: code,
      });
    } catch (e: any) {
      console.error('Pairing error:', e);
      const data = e?.response?.data;
      const base = data?.error || data?.message || e?.message || 'Failed to pair hub';
      const details = Array.isArray(data?.errors)
        ? data.errors.map((x: any) => x?.message).filter(Boolean).join('\n')
        : '';
      Alert.alert('Pairing Failed', details ? `${base}\n${details}` : base);
      throw e;
    }
  };

  const handleManualPair = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Missing Code', 'Enter the hub code to continue.');
      return;
    }

    try {
      setManualLoading(true);
      await pairHubWithCode(manualCode.trim());
    } catch (e) {
      // Error already surfaced inside pairHubWithCode
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pair your VeaHub</Text>
      <Text style={styles.subtitle}>Enter the hub code printed on your device</Text>
      <TextInput
        style={styles.manualInput}
        placeholder="e.g. HUB-1234-5678"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="characters"
        autoCorrect={false}
        value={manualCode}
        onChangeText={setManualCode}
      />
      <TouchableOpacity
        style={[styles.scanButton, manualLoading && styles.scanButtonDisabled]}
        onPress={handleManualPair}
        disabled={manualLoading}
      >
        {manualLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>Pair Hub</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  header: { color: colors.foreground, fontSize: 24, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  subtitle: { color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.xl, fontSize: 16 },
  scanButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.glow,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  manualInput: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.foreground,
    backgroundColor: colors.card,
    fontSize: 16,
  },
});


