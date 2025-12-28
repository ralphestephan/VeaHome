import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Clock, Edit, Trash2, Sun, Moon, Coffee, Bed } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import Header from '../components/Header';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { getApiClient, SchedulesApi } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Demo schedules data
const demoSchedules = [
  { id: 'sch1', name: 'Morning Routine', time: '07:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], enabled: true, icon: 'sun' },
  { id: 'sch2', name: 'Good Night', time: '22:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], enabled: true, icon: 'moon' },
  { id: 'sch3', name: 'Weekend Wake Up', time: '09:00', days: ['Sat', 'Sun'], enabled: true, icon: 'coffee' },
  { id: 'sch4', name: 'Movie Night', time: '20:00', days: ['Fri', 'Sat'], enabled: false, icon: 'moon' },
];

type RouteProp = {
  key: string;
  name: string;
  params?: {
    homeId?: string;
  };
};

export default function SchedulesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user, token, currentHomeId } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const demo = useDemo();
  const isDemoMode = token === 'DEMO_TOKEN';
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const homeId = route.params?.homeId || currentHomeId || user?.homeId;
  console.log('[SchedulesScreen] homeId:', homeId, 'route.params:', route.params);
  
  const client = useMemo(() => getApiClient(async () => token), [token]);
  const schedulesApi = useMemo(() => SchedulesApi(client), [client]);

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

  const loadSchedules = useCallback(async () => {
    if (isDemoMode) {
      // Show empty state in demo mode
      setSchedules([]);
      setLoading(false);
      return;
    }
    if (!homeId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await schedulesApi.listSchedules(homeId).catch(() => ({ data: [] }));
      const payload = unwrap(res.data);
      const schedulesData = payload?.schedules || (Array.isArray(payload) ? payload : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [homeId, isDemoMode, schedulesApi]);

  // Refresh when screen comes into focus (e.g., after creating/editing a schedule)
  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules])
  );

  const handleAdd = async () => {
    console.log('[SchedulesScreen] handleAdd called, homeId:', homeId);
    if (!homeId) {
      Alert.alert('Error', 'Home ID is required. Please ensure you are logged in.');
      return;
    }
    console.log('[SchedulesScreen] Navigating to ScheduleForm with homeId:', homeId);
    navigation.navigate('ScheduleForm', { homeId });
  };

  const handleEdit = (schedule: any) => {
    if (!homeId) return;
    navigation.navigate('ScheduleForm', { homeId, scheduleId: schedule.id });
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
              <TouchableOpacity
                key={s.id}
                onPress={() => handleEdit(s)}
                style={[styles.card, s.enabled && styles.cardActive]}
              >
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
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id);
                      }}
                    >
                      <Trash2 size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
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




