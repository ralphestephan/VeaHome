import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Clock, Edit, Trash2, Sun, Moon, Coffee, Bed } from 'lucide-react-native';
import Header from '../components/Header';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { getApiClient, SchedulesApi } from '../services/api';

// Demo schedules data
const demoSchedules = [
  { id: 'sch1', name: 'Morning Routine', time: '07:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], enabled: true, icon: 'sun' },
  { id: 'sch2', name: 'Good Night', time: '22:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], enabled: true, icon: 'moon' },
  { id: 'sch3', name: 'Weekend Wake Up', time: '09:00', days: ['Sat', 'Sun'], enabled: true, icon: 'coffee' },
  { id: 'sch4', name: 'Movie Night', time: '20:00', days: ['Fri', 'Sat'], enabled: false, icon: 'moon' },
];

export default function SchedulesScreen() {
  const { user, token, currentHomeId } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const demo = useDemo();
  const isDemoMode = token === 'DEMO_TOKEN';
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const homeId = currentHomeId || user?.homeId;
  const client = getApiClient(async () => token);
  const schedulesApi = SchedulesApi(client);

  const unwrap = (data: any) => (data && typeof data === 'object' && 'data' in data ? (data as any).data : data);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const scheduleIcons: Record<string, any> = {
    'sun': Sun,
    'moon': Moon,
    'coffee': Coffee,
    'bed': Bed,
    'clock': Clock,
  };

  const loadSchedules = async () => {
    if (isDemoMode) {
      // Show empty state in demo mode
      setSchedules([]);
      setLoading(false);
      return;
    }
    if (!homeId) return;
    try {
      setLoading(true);
      const res = await schedulesApi.listSchedules(homeId).catch(() => ({ data: [] }));
      const payload = unwrap(res.data);
      setSchedules(Array.isArray(payload) ? payload : []);
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
    if (isDemoMode) {
      const newSchedule = {
        id: `sch${Date.now()}`,
        name: 'New Schedule',
        time: '12:00',
        days: ['Mon', 'Wed', 'Fri'],
        enabled: true,
        icon: 'clock',
      };
      setSchedules(prev => [...prev, newSchedule]);
      return;
    }
    if (!homeId) return;
    try {
      const payload = { name: 'New Schedule', time: '22:00', days: ['Mon','Tue','Wed','Thu','Fri'], actions: [] };
      await schedulesApi.createSchedule(homeId, payload);
      loadSchedules();
    } catch (e) {
      Alert.alert('Error', 'Failed to create schedule');
    }
  };

  const handleToggle = (id: string) => {
    if (isDemoMode) {
      setSchedules(prev => prev.map(s => 
        s.id === id ? { ...s, enabled: !s.enabled } : s
      ));
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemoMode) {
      setSchedules(prev => prev.filter(s => s.id !== id));
      return;
    }
    if (!homeId) return;
    try {
      await schedulesApi.deleteSchedule(homeId, id);
      loadSchedules();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete schedule');
    }
  };

  const getScheduleIcon = (schedule: any) => {
    const iconName = schedule.icon || 'clock';
    return scheduleIcons[iconName] || Clock;
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
          {schedules.map((s) => {
            const IconComponent = getScheduleIcon(s);
            return (
              <View key={s.id} style={[styles.card, s.enabled && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.icon, s.enabled && styles.iconActive]}>
                    <IconComponent size={18} color={s.enabled ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <Text style={styles.cardSubtitle}>{s.time} • {Array.isArray(s.days) ? s.days.join(', ') : ''}</Text>
                  </View>
                  {isDemoMode ? (
                    <Switch
                      value={s.enabled}
                      onValueChange={() => handleToggle(s.id)}
                      trackColor={{ false: colors.muted, true: colors.primary + '60' }}
                      thumbColor={s.enabled ? colors.primary : colors.mutedForeground}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => handleDelete(s.id)}>
                      <Trash2 size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {schedules.length === 0 && (
            <Text style={styles.empty}>No schedules yet</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    subHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    },
    subtitle: { fontSize: fontSize.xs, color: colors.mutedForeground },
    addButton: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      ...shadows.neonPrimary,
    },
    addButtonText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
    loadingContainer: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
    loadingText: { fontSize: fontSize.sm, color: colors.mutedForeground },
    scrollContent: { padding: spacing.lg, gap: spacing.md },
    card: { 
      backgroundColor: colors.card, 
      borderRadius: borderRadius.xl, 
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
    },
    cardActive: {
      borderColor: colors.primary + '60',
      ...shadows.neonPrimary,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: { 
      width: 40, 
      height: 40, 
      borderRadius: borderRadius.lg, 
      backgroundColor: colors.muted, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    iconActive: {
      backgroundColor: `${colors.primary}20`,
    },
    titleWrap: { flex: 1 },
    cardTitle: { color: colors.foreground, fontWeight: '600', fontSize: fontSize.md },
    cardSubtitle: { color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: 2 },
    empty: { textAlign: 'center', color: colors.mutedForeground, padding: spacing.xl, fontSize: fontSize.md },
  });




