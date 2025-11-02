import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Clock, Edit, Trash2 } from 'lucide-react-native';
import Header from '../components/Header';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getApiClient, SchedulesApi } from '../services/api';

export default function SchedulesScreen() {
  const { user, token } = useAuth();
  const homeId = user?.homeId;
  const client = getApiClient(async () => token);
  const schedulesApi = SchedulesApi(client);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = async () => {
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await schedulesApi.listSchedules(homeId).catch(() => ({ data: [] }));
      setSchedules(res.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [homeId]);

  const handleAdd = async () => {
    if (!homeId) return;
    try {
      const payload = { name: 'New Schedule', time: '22:00', days: ['Mon','Tue','Wed','Thu','Fri'], actions: [] };
      await schedulesApi.createSchedule(homeId, payload);
      loadSchedules();
    } catch (e) {
      Alert.alert('Error', 'Failed to create schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!homeId) return;
    try {
      await schedulesApi.deleteSchedule(homeId, id);
      loadSchedules();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete schedule');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Schedules" showBack />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{schedules.length} schedules</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Plus size={16} color="white" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {schedules.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.icon}>
                  <Clock size={18} color={colors.primary} />
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardSubtitle}>{s.time} • {Array.isArray(s.days) ? s.days.join(', ') : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(s.id)}>
                  <Trash2 size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {schedules.length === 0 && (
            <Text style={styles.empty}>No schedules yet</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  subtitle: { fontSize: 11, color: colors.mutedForeground },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addButtonText: { color: 'white', fontWeight: '600' },
  loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: 12, color: colors.mutedForeground },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  card: { backgroundColor: colors.secondary, borderRadius: borderRadius.lg, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  cardTitle: { color: colors.foreground, fontWeight: '600' },
  cardSubtitle: { color: colors.mutedForeground, fontSize: 12 },
  empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl },
});



