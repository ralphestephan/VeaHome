import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../constants/theme';
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [Scanner, setScanner] = useState<null | BarCodeScannerType['BarCodeScanner']>(null);
  const [scanning, setScanning] = useState(false);
  const { token, user, refreshMe } = useAuth();
  const client = getApiClient(async () => token);
  const hub = HubApi(client);

  const startScanning = async () => {
    try {
      const mod: BarCodeScannerType = await import('expo-barcode-scanner');
      setScanner(() => mod.BarCodeScanner);
      const { status } = await mod.BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      setScanning(true);
    } catch (e) {
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const homeId = user?.homeId ?? 'default';
      const response = await hub.pairHub(data, homeId);
      await refreshMe();
      
      // Navigate to Hub Setup Wizard
      const hubId = response.data?.hubId || response.data?.id || data;
      navigation.replace('HubSetup', {
        hubId,
        qrCode: data,
      });
    } catch (e: any) {
      console.error('Pairing error:', e);
      alert(e?.response?.data?.message || 'Failed to pair hub');
      setScanned(false);
    }
  };

  if (!scanning) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Pair your VeaHub</Text>
        <Text style={styles.subtitle}>Connect your hub to get started</Text>
        <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
          <Text style={styles.scanButtonText}>Scan QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualButton}>
          <Text style={styles.manualText}>Enter code manually</Text>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  header: { color: colors.foreground, fontSize: 20, fontWeight: '700', marginBottom: spacing.md, textAlign: 'center' },
  subtitle: { color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.xl },
  scannerBox: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  caption: { color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.md },
  scanButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scanButtonText: { color: '#fff', fontWeight: '600' },
  manualButton: { padding: spacing.md, alignItems: 'center' },
  manualText: { color: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { color: colors.foreground },
});


