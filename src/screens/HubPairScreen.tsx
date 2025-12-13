import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getApiClient, HubApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type BarCodeScannerType = {
  BarCodeScanner: React.ComponentType<any> & { requestPermissionsAsync: () => Promise<{ status: string }> };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HubPairScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [Scanner, setScanner] = useState<null | BarCodeScannerType['BarCodeScanner']>(null);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const { token, user, refreshMe } = useAuth();
  const client = getApiClient(async () => token);
  const hub = HubApi(client);

  const startScanning = async () => {
    try {
      const mod: BarCodeScannerType = await import('expo-barcode-scanner');
      setScanner(() => mod.BarCodeScanner);
      const { status } = await mod.BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      setManualMode(false);
      setScanning(true);
    } catch (e) {
      setHasPermission(false);
    }
  };

  const pairHubWithCode = async (code: string) => {
    try {
      const homeId = user?.homeId ?? 'default';
      const response = await hub.pairHub(code, homeId);
      await refreshMe();
      const hubId = response.data?.hubId || response.data?.id || code;
      navigation.replace('HubSetup', {
        hubId,
        qrCode: code,
      });
    } catch (e: any) {
      console.error('Pairing error:', e);
      Alert.alert('Pairing Failed', e?.response?.data?.message || 'Failed to pair hub');
      throw e;
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      await pairHubWithCode(data);
    } catch (e: any) {
      setScanned(false);
    }
  };

  const handleManualPair = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Missing Code', 'Enter the hub code printed below the QR sticker to continue.');
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

  if (!scanning) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Pair your VeaHub</Text>
        <Text style={styles.subtitle}>
          {manualMode
            ? 'Enter the hub code printed next to the QR sticker.'
            : 'Connect your hub to get started'}
        </Text>
        {manualMode ? (
          <>
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
            <TouchableOpacity style={styles.manualButton} onPress={() => setManualMode(false)}>
              <Text style={styles.manualText}>Back to camera</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
              <Text style={styles.scanButtonText}>Scan QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualButton} onPress={() => setManualMode(true)}>
              <Text style={styles.manualText}>Enter code manually</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera access</Text>
        <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
          <Text style={styles.scanButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Scan your VeaHub QR</Text>
      <View style={styles.scannerBox}>
        {Scanner ? (
          <Scanner onBarCodeScanned={handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.text}>Loading scanner...</Text>
          </View>
        )}
      </View>
      <Text style={styles.caption}>Align the QR within the frame</Text>
      <TouchableOpacity style={styles.manualButton} onPress={() => setScanning(false)}>
        <Text style={styles.manualText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.manualButton}
        onPress={() => {
          setScanning(false);
          setManualMode(true);
        }}
      >
        <Text style={styles.manualText}>Enter code manually</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  header: { color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  subtitle: { color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.xl },
  scannerBox: { flex: 1, borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  caption: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.md },
  scanButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.glow,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: { color: '#fff', fontWeight: '600' },
  manualButton: { padding: spacing.md, alignItems: 'center' },
  manualText: { color: colors.primary },
  manualInput: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.foreground,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { color: colors.foreground },
});


