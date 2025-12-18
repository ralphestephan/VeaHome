import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Save, 
  Trash2,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Clock,
  Sun,
  Moon,
  ChevronRight,
  Plus,
  Lightbulb,
  Power,
  Fan as FanIcon,
} from 'lucide-react-native';
import { spacing, borderRadius, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, AutomationsApi } from '../services/api';
import { useHomeData } from '../hooks/useHomeData';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    automationId?: string;
    homeId: string;
  };
};

const TRIGGER_TYPES = [
  { id: 'sensor', name: 'Sensor Alert', icon: Thermometer, description: 'When AirGuard detects an alert' },
  { id: 'time', name: 'Time of Day', icon: Clock, description: 'At a specific time' },
  { id: 'sunrise', name: 'Sunrise', icon: Sun, description: 'At sunrise' },
  { id: 'sunset', name: 'Sunset', icon: Moon, description: 'At sunset' },
];

const SENSOR_TYPES = [
  { id: 'temperature', name: 'Temperature', icon: Thermometer, unit: '°C' },
  { id: 'humidity', name: 'Humidity', icon: Droplets, unit: '%' },
  { id: 'dust', name: 'Dust/PM2.5', icon: Wind, unit: 'μg/m³' },
  { id: 'mq2', name: 'Gas (MQ2)', icon: Flame, unit: 'ppm' },
];

const SENSOR_CONDITIONS = [
  { id: 'above', name: 'Above', symbol: '>' },
  { id: 'below', name: 'Below', symbol: '<' },
];

const ACTION_TYPES = [
  { id: 'device_on', name: 'Turn Device On', icon: Power },
  { id: 'device_off', name: 'Turn Device Off', icon: Power },
  { id: 'mute_airguard', name: 'Mute AirGuard', icon: Thermometer },
  { id: 'unmute_airguard', name: 'Unmute AirGuard', icon: Thermometer },
];

export default function AutomationFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token } = useAuth();
  const { automationId, homeId } = route.params || { homeId: user?.homeId || '' };
  const { devices } = useHomeData(homeId);

  const [loading, setLoading] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  // Trigger configuration
  const [triggerType, setTriggerType] = useState<string>('sensor');
  const [sensorType, setSensorType] = useState<string>('temperature');
  const [sensorCondition, setSensorCondition] = useState<string>('above');
  const [sensorValue, setSensorValue] = useState<string>('30');
  const [triggerTime, setTriggerTime] = useState<string>('08:00');

  // Actions configuration
  const [actions, setActions] = useState<Array<{
    id: string;
    type: string;
    deviceId?: string;
    value?: any;
  }>>([]);

  const client = getApiClient(async () => token);
  const automationsApi = AutomationsApi(client);

  useEffect(() => {
    if (automationId && homeId) {
      loadAutomation();
    }
  }, [automationId, homeId]);

  const loadAutomation = async () => {
    try {
      setLoading(true);
      const response = await automationsApi.listAutomations(homeId);
      const automation = (response.data?.automations || []).find((a: any) => a.id === automationId);
      if (automation) {
        setAutomationName(automation.name);
        setEnabled(automation.enabled !== false);
        
        // Parse trigger
        if (automation.trigger) {
          setTriggerType(automation.trigger.type || 'sensor');
          if (automation.trigger.type === 'sensor') {
            setSensorType(automation.trigger.sensorType || 'temperature');
            setSensorCondition(automation.trigger.condition || 'above');
            setSensorValue(automation.trigger.value?.toString() || '30');
          } else if (automation.trigger.type === 'time') {
            setTriggerTime(automation.trigger.at || '08:00');
          }
        }
        
        // Parse actions
        if (Array.isArray(automation.actions)) {
          setActions(automation.actions.map((a: any, idx: number) => ({
            id: `action_${idx}`,
            ...a,
          })));
        }
      }
    } catch (e) {
      console.error('Error loading automation:', e);
    } finally {
      setLoading(false);
    }
  };

  const addAction = () => {
    setActions([...actions, {
      id: `action_${Date.now()}`,
      type: 'device_on',
    }]);
  };

  const updateAction = (id: string, field: string, value: any) => {
    setActions(actions.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const handleSave = async () => {
    if (!automationName.trim()) {
      Alert.alert('Error', 'Please enter automation name');
      return;
    }

    if (actions.length === 0) {
      Alert.alert('Error', 'Please add at least one action');
      return;
    }

    setLoading(true);
    try {
      const trigger: any = { type: triggerType };
      
      if (triggerType === 'sensor') {
        trigger.sensorType = sensorType;
        trigger.condition = sensorCondition;
        trigger.value = parseFloat(sensorValue) || 0;
      } else if (triggerType === 'time') {
        trigger.at = triggerTime;
      }

      const payload = {
        name: automationName.trim(),
        trigger,
        actions: actions.map(({ id, ...rest }) => rest),
        enabled,
      };

      if (automationId) {
        await automationsApi.updateAutomation(homeId, automationId, payload);
      } else {
        await automationsApi.createAutomation(homeId, payload);
      }

      Alert.alert('Success', `Automation ${automationId ? 'updated' : 'created'} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Save automation error:', error);
      Alert.alert('Error', error.message || 'Failed to save automation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Automation',
      'Are you sure you want to delete this automation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await automationsApi.deleteAutomation(homeId, automationId!);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete automation');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && automationId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title={automationId ? 'Edit Automation' : 'Create Automation'}
          showBack
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading automation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const triggerTypeObj = TRIGGER_TYPES.find(t => t.id === triggerType);
  const sensorTypeObj = SENSOR_TYPES.find(s => s.id === sensorType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={automationId ? 'Edit Automation' : 'Create Automation'}
        showBack
        showSettings={false}
      />
      <CreationHero
        eyebrow={automationId ? 'Automation details' : 'New automation'}
        title={automationId ? 'Edit Automation' : 'Create Automation'}
        description="Automate your home based on sensor readings or time schedules."
        meta={`${actions.length} action${actions.length === 1 ? '' : 's'}`}
        actionSlot={automationId ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={18} color={colors.destructive || '#ef4444'} />
          </TouchableOpacity>
        ) : undefined}
      />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Automation Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Automation Name</Text>
          <TextInput
            style={styles.input}
            value={automationName}
            onChangeText={setAutomationName}
            placeholder="e.g., Turn on Fan when Hot"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Enabled Toggle */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Enabled</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.muted, true: colors.primary + '60' }}
              thumbColor={enabled ? colors.primary : colors.mutedForeground}
            />
          </View>
        </View>

        {/* Trigger Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Trigger</Text>
          <View style={styles.triggerGrid}>
            {TRIGGER_TYPES.map(({ id, name, icon: Icon, description }) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.triggerCard,
                  triggerType === id && styles.triggerCardSelected,
                ]}
                onPress={() => setTriggerType(id)}
              >
                <Icon
                  size={24}
                  color={triggerType === id ? 'white' : colors.primary}
                />
                <Text
                  style={[
                    styles.triggerName,
                    triggerType === id && styles.triggerNameSelected,
                  ]}
                >
                  {name}
                </Text>
                <Text
                  style={[
                    styles.triggerDesc,
                    triggerType === id && styles.triggerDescSelected,
                  ]}
                >
                  {description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trigger Configuration */}
        {triggerType === 'sensor' && (
          <View style={styles.section}>
            <Text style={styles.label}>Sensor Configuration</Text>
            
            {/* Sensor Type */}
            <View style={styles.configGroup}>
              <Text style={styles.configLabel}>Sensor Type</Text>
              <View style={styles.sensorGrid}>
                {SENSOR_TYPES.map(({ id, name, icon: Icon }) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.sensorButton,
                      sensorType === id && styles.sensorButtonSelected,
                    ]}
                    onPress={() => setSensorType(id)}
                  >
                    <Icon size={18} color={sensorType === id ? 'white' : colors.primary} />
                    <Text
                      style={[
                        styles.sensorButtonText,
                        sensorType === id && styles.sensorButtonTextSelected,
                      ]}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Condition */}
            <View style={styles.configGroup}>
              <Text style={styles.configLabel}>Condition</Text>
              <View style={styles.conditionRow}>
                {SENSOR_CONDITIONS.map(({ id, name, symbol }) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.conditionButton,
                      sensorCondition === id && styles.conditionButtonSelected,
                    ]}
                    onPress={() => setSensorCondition(id)}
                  >
                    <Text
                      style={[
                        styles.conditionText,
                        sensorCondition === id && styles.conditionTextSelected,
                      ]}
                    >
                      {name} ({symbol})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Value */}
            <View style={styles.configGroup}>
              <Text style={styles.configLabel}>
                Value ({sensorTypeObj?.unit || ''})
              </Text>
              <TextInput
                style={styles.valueInput}
                value={sensorValue}
                onChangeText={setSensorValue}
                placeholder="30"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Trigger when {sensorTypeObj?.name.toLowerCase()} is{' '}
                {sensorCondition === 'above' ? 'above' : 'below'} {sensorValue}
                {sensorTypeObj?.unit}
              </Text>
            </View>
          </View>
        )}

        {triggerType === 'time' && (
          <View style={styles.section}>
            <Text style={styles.label}>Time</Text>
            <TextInput
              style={styles.input}
              value={triggerTime}
              onChangeText={setTriggerTime}
              placeholder="08:00"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Actions ({actions.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={addAction}>
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>Add Action</Text>
            </TouchableOpacity>
          </View>

          {actions.map((action) => {
            const actionType = ACTION_TYPES.find(at => at.type === action.type);
            const needsDevice = action.type === 'device_on' || action.type === 'device_off';
            const selectedDevice = needsDevice ? devices.find(d => d.id === action.deviceId) : null;

            return (
              <View key={action.id} style={styles.actionCard}>
                <View style={styles.actionHeader}>
                  <Text style={styles.actionTitle}>Action</Text>
                  <TouchableOpacity onPress={() => removeAction(action.id)}>
                    <Trash2 size={16} color={colors.destructive || '#ef4444'} />
                  </TouchableOpacity>
                </View>

                {/* Action Type */}
                <View style={styles.actionGrid}>
                  {ACTION_TYPES.map(({ id, name, icon: Icon }) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.actionButton,
                        action.type === id && styles.actionButtonSelected,
                      ]}
                      onPress={() => updateAction(action.id, 'type', id)}
                    >
                      <Icon size={16} color={action.type === id ? 'white' : colors.primary} />
                      <Text
                        style={[
                          styles.actionButtonText,
                          action.type === id && styles.actionButtonTextSelected,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Device Selection */}
                {needsDevice && (
                  <View style={styles.deviceSelection}>
                    <Text style={styles.configLabel}>Select Device</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.deviceChips}>
                        {devices.filter(d => d.type !== 'airguard').map((device) => (
                          <TouchableOpacity
                            key={device.id}
                            style={[
                              styles.deviceChip,
                              action.deviceId === device.id && styles.deviceChipSelected,
                            ]}
                            onPress={() => updateAction(action.id, 'deviceId', device.id)}
                          >
                            <Text
                              style={[
                                styles.deviceChipText,
                                action.deviceId === device.id && styles.deviceChipTextSelected,
                              ]}
                            >
                              {device.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}

          {actions.length === 0 && (
            <Text style={styles.emptyText}>No actions added yet</Text>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {automationId ? 'Update Automation' : 'Create Automation'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  section: {
    gap: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  triggerCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  triggerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    ...shadows.neonPrimary,
  },
  triggerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  triggerNameSelected: {
    color: 'white',
  },
  triggerDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  triggerDescSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  configGroup: {
    gap: spacing.sm,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sensorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sensorButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sensorButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  sensorButtonTextSelected: {
    color: 'white',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  conditionButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  conditionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.foreground,
  },
  conditionTextSelected: {
    color: 'white',
  },
  valueInput: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBox: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  summaryText: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.neonPrimary,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.foreground,
  },
  actionButtonTextSelected: {
    color: 'white',
  },
  deviceSelection: {
    gap: spacing.sm,
  },
  deviceChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deviceChip: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.foreground,
  },
  deviceChipTextSelected: {
    color: 'white',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 14,
    paddingVertical: spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.neonPrimary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
