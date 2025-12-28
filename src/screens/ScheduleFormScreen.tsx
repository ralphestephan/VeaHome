import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Save, 
  Trash2,
  Clock,
  Wand2,
  Check,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, SchedulesApi, ScenesApi } from '../services/api';
import { useToast } from '../components/Toast';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    scheduleId?: string;
    homeId: string;
  };
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token } = useAuth();
  const { scheduleId, homeId } = route.params;
  const effectiveHomeId = homeId || user?.homeId || '';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [time, setTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  
  // Modal states
  const [scenePickerVisible, setScenePickerVisible] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);

  const client = useMemo(() => getApiClient(async () => token), [token]);
  const schedulesApi = useMemo(() => SchedulesApi(client), [client]);
  const scenesApi = useMemo(() => ScenesApi(client), [client]);

  const loadScenes = useCallback(async () => {
    if (!effectiveHomeId) return;
    try {
      const res = await scenesApi.listScenes(effectiveHomeId);
      const scenesData = (res?.data?.data?.scenes ?? res?.data?.scenes ?? res?.data?.data ?? res?.data) || [];
      setScenes(Array.isArray(scenesData) ? scenesData : []);
    } catch (e) {
      console.error('Error loading scenes:', e);
    }
  }, [effectiveHomeId, scenesApi]);

  const loadSchedule = useCallback(async () => {
    if (!effectiveHomeId || !scheduleId) return;
    try {
      setLoading(true);
      const res = await schedulesApi.listSchedules(effectiveHomeId);
      const schedulesData = (res?.data?.data?.schedules ?? res?.data?.schedules ?? res?.data?.data ?? res?.data) || [];
      const schedule = Array.isArray(schedulesData) ? schedulesData.find((s: any) => s.id === scheduleId) : null;
      
      if (schedule) {
        setScheduleName(schedule.name || '');
        setTime(schedule.time || '');
        setSelectedDays(new Set(Array.isArray(schedule.days) ? schedule.days : []));
        setEnabled(schedule.enabled !== false);
        
        // Find scene action - handle both array and object formats
        let sceneAction = null;
        if (Array.isArray(schedule.actions)) {
          sceneAction = schedule.actions.find((a: any) => a.type === 'scene');
        } else if (schedule.actions && typeof schedule.actions === 'object') {
          // Handle case where actions might be an object
          sceneAction = schedule.actions.type === 'scene' ? schedule.actions : null;
        }
        
        if (sceneAction?.sceneId) {
          setSelectedSceneId(sceneAction.sceneId);
        } else {
          // Reset scene selection if no scene action found
          setSelectedSceneId(null);
        }
      }
    } catch (e) {
      console.error('Error loading schedule:', e);
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [effectiveHomeId, scheduleId, schedulesApi]);

  useEffect(() => {
    if (effectiveHomeId) {
      loadScenes();
    }
  }, [effectiveHomeId, loadScenes]);

  useEffect(() => {
    if (scheduleId && effectiveHomeId) {
      loadSchedule();
    }
  }, [scheduleId, effectiveHomeId, loadSchedule]);

  const handleSave = async () => {
    // Prevent multiple saves
    if (saving || loading) {
      return;
    }

    if (!scheduleName.trim()) {
      showToast('Schedule name is required', { type: 'error' });
      return;
    }
    
    if (!time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
      showToast('Invalid time format. Use HH:MM', { type: 'error' });
      return;
    }
    
    if (selectedDays.size === 0) {
      showToast('Select at least one day', { type: 'error' });
      return;
    }
    
    if (!selectedSceneId) {
      showToast('Select a scene to activate', { type: 'error' });
      return;
    }

    if (!effectiveHomeId) return;

    try {
      setSaving(true);
      const payload = {
        name: scheduleName.trim(),
        time,
        days: Array.from(selectedDays),
        actions: [
          {
            type: 'scene',
            sceneId: selectedSceneId,
          },
        ],
        enabled,
      };

      if (scheduleId) {
        await schedulesApi.updateSchedule(effectiveHomeId, scheduleId, payload);
        showToast('Schedule updated successfully', { type: 'success' });
      } else {
        await schedulesApi.createSchedule(effectiveHomeId, payload);
        showToast('Schedule created successfully', { type: 'success' });
      }

      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (e: any) {
      console.error('Error saving schedule:', e);
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to save schedule';
      showToast(errorMessage, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!effectiveHomeId || !scheduleId) return;

    const confirmed = Platform.OS !== 'web' 
      ? await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Schedule',
            'Are you sure you want to delete this schedule?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        })
      : window.confirm('Are you sure you want to delete this schedule?');

    if (!confirmed) return;

    try {
      setLoading(true);
      await schedulesApi.deleteSchedule(effectiveHomeId, scheduleId);
      showToast('Schedule deleted successfully', { type: 'success' });
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (e: any) {
      console.error('Error deleting schedule:', e);
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to delete schedule';
      showToast(errorMessage, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setSelectedDays(newDays);
  };

  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title={scheduleId ? 'Edit Schedule' : 'New Schedule'} 
        showBack
        actionSlot={
          <View style={styles.headerActions}>
            {scheduleId && (
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.deleteButton}
                disabled={loading}
              >
                <Trash2 size={20} color="#FF6B6B" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, (loading || saving) && styles.saveButtonDisabled]}
              disabled={loading || saving}
            >
              <Save size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />
      
      {loading && !scheduleName ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <CreationHero
            eyebrow={scheduleId ? 'Edit schedule' : 'Create schedule'}
            title={scheduleId ? 'Update your schedule' : 'Schedule scenes'}
            description={scheduleId ? 'Modify when and which scene activates' : 'Set up automatic scene activation at specific times'}
          />

          {/* Schedule Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Schedule Name</Text>
            <TextInput
              style={styles.input}
              value={scheduleName}
              onChangeText={setScheduleName}
              placeholder="e.g., Morning Routine"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="08:00"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.hint}>Use 24-hour format (e.g., 08:00, 22:30)</Text>
          </View>

          {/* Days */}
          <View style={styles.section}>
            <Text style={styles.label}>Days</Text>
            <View style={styles.chipGroup}>
              {DAYS.map(day => {
                const isSelected = selectedDays.has(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Scene Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Activate Scene</Text>
            <TouchableOpacity
              style={styles.scenePickerButton}
              onPress={() => setScenePickerVisible(true)}
            >
              <View style={styles.scenePickerContent}>
                <Wand2 size={20} color={colors.primary} />
                <Text style={[styles.scenePickerText, !selectedSceneId && styles.scenePickerPlaceholder]}>
                  {selectedScene ? selectedScene.name : 'Select a scene...'}
                </Text>
              </View>
              <Text style={styles.scenePickerChevron}>›</Text>
            </TouchableOpacity>
            {selectedSceneId && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSelectedSceneId(null)}
              >
                <Text style={styles.clearButtonText}>Clear selection</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Enabled Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.label}>Enabled</Text>
                <Text style={styles.hint}>Schedule will run automatically when enabled</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: colors.muted, true: colors.primary + '60' }}
                thumbColor={enabled ? colors.primary : colors.mutedForeground}
              />
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}

      {/* Scene Picker Modal */}
      <Modal
        visible={scenePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScenePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Scene</Text>
              <TouchableOpacity
                onPress={() => setScenePickerVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={scenes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedSceneId;
                return (
                  <TouchableOpacity
                    style={[styles.sceneItem, isSelected && styles.sceneItemSelected]}
                    onPress={() => {
                      setSelectedSceneId(item.id);
                      setScenePickerVisible(false);
                    }}
                  >
                    <Text style={[styles.sceneItemText, isSelected && styles.sceneItemTextSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No scenes available</Text>
                  <Text style={styles.emptyStateHint}>Create a scene first to schedule it</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Save Button at Bottom */}
      <TouchableOpacity
        style={[styles.saveButtonBottom, (loading || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading || saving}
      >
        {(loading || saving) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Save size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {scheduleId ? 'Update Schedule' : 'Create Schedule'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scenePickerButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scenePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  scenePickerText: {
    fontSize: fontSize.md,
    color: colors.foreground,
    flex: 1,
  },
  scenePickerPlaceholder: {
    color: colors.mutedForeground,
  },
  scenePickerChevron: {
    fontSize: fontSize.xl,
    color: colors.mutedForeground,
  },
  clearButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.neonPrimary,
  },
  saveButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    marginTop: spacing.md,
    ...shadows.neonPrimary,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sceneItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  sceneItemText: {
    fontSize: fontSize.md,
    color: colors.foreground,
  },
  sceneItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  emptyStateHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});

