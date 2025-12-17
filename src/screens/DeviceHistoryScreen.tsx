import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import Header from '../components/Header';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApiClient, DeviceHistoryApi } from '../services/api';

type Props = {
  route: { params: { deviceId: string } };
};

export default function DeviceHistoryScreen({ route }: Props) {
  const { token, currentHomeId, user } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { deviceId } = route.params || { deviceId: '' };
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const client = getApiClient(async () => token);
  const historyApi = DeviceHistoryApi(client);

  const unwrap = (data: any) => (data && typeof data === 'object' && 'data' in data ? (data as any).data : data);
  const homeId = currentHomeId || user?.homeId;

  const loadHistory = async () => {
    if (!homeId || !deviceId) return;
    try {
      setLoading(true);
      const res = await historyApi.getDeviceHistory(homeId, deviceId).catch(() => ({ data: [] }));
      const payload = unwrap(res.data);
      setHistory(Array.isArray(payload) ? payload : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load device history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [homeId, deviceId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Device History" showBack />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {history.map((h, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.icon}><Clock size={16} color={colors.primary} /></View>
                <Text style={styles.title}>{h.event || h.state || 'Event'}</Text>
              </View>
              <Text style={styles.subtitle}>{h.timestamp || h.time}</Text>
            </View>
          ))}
          {history.length === 0 && (
            <Text style={styles.empty}>No history available</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 28, height: 28, borderRadius: borderRadius.sm, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontWeight: '600' },
  subtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl },
});




