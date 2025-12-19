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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Save, 
  Trash2,
  Plus,
  ChevronDown,
  Thermometer,
  Droplets,
  Wind,
  Lightbulb,
  Power,
  Fan as FanIcon,
  Clock,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
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

type TriggerType = 'sensor' | 'device_state' | 'time' | 'sunset' | 'sunrise';
type TriggerLogic = 'AND' | 'OR';

interface Trigger {
  id: string;
  type: TriggerType;
  deviceId?: string;
  sensorType?: string;
  condition?: string;
  value?: any;
  at?: string;
}

interface Action {
  id: string;
  type: string;
  deviceId?: string;
  value?: any;
}

const TRIGGER_TYPES = [
  { id: 'sensor', name: 'Sensor Value', icon: Thermometer },
  { id: 'device_state', name: 'Device State', icon: Power },
  { id: 'time', name: 'Time of Day', icon: Clock },
];

const SENSOR_TYPES = [
  { id: 'temperature', name: 'Temperature', unit: '°C' },
  { id: 'humidity', name: 'Humidity', unit: '%' },
  { id: 'aqi', name: 'Air Quality', unit: 'AQI' },
  { id: 'pm25', name: 'PM2.5', unit: 'μg/m³' },
  { id: 'mq2', name: 'Gas Level', unit: 'ppm' },
];

const CONDITIONS = [
  { id: 'above', name: 'Above', symbol: '>' },
  { id: 'below', name: 'Below', symbol: '<' },
  { id: 'equals', name: 'Equals', symbol: '=' },
];

const DEVICE_STATE_CONDITIONS = [
  { id: 'is_on', name: 'Is ON' },
  { id: 'is_off', name: 'Is OFF' },
];

const ACTION_TYPES = [
  { id: 'device_on', name: 'Turn Device ON', icon: Power },
  { id: 'device_off', name: 'Turn Device OFF', icon: Power },
  { id: 'set_value', name: 'Set Value', icon: Thermometer },
];

export default function AutomationFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token } = useAuth();
  const { automationId, homeId } = route.params || { homeId: user?.homeId || '' };
  const { devices, rooms } = useHomeData(homeId);

  const [loading, setLoading] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [triggerLogic, setTriggerLogic] = useState<TriggerLogic>('AND');
  const [actions, setActions] = useState<Action[]>([]);

  // Device picker modal states
  const [devicePickerVisible, setDevicePickerVisible] = useState(false);
  const [devicePickerFor, setDevicePickerFor] = useState<{ type: 'trigger' | 'action', id: string } | null>(null);

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
        
        // Parse triggers (support multiple)
        if (automation.triggers && Array.isArray(automation.triggers)) {
          setTriggers(automation.triggers.map((t: any, idx: number) => ({
            id: `trigger_${idx}`,
            ...t,
          })));
          setTriggerLogic(automation.triggerLogic || 'AND');
        } else if (automation.trigger) {
          // Legacy single trigger support
          setTriggers([{ id: 'trigger_0', ...automation.trigger }]);
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

  const addTrigger = () => {
    setTriggers([...triggers, {
      id: `trigger_${Date.now()}`,
      type: 'sensor',
      sensorType: 'temperature',
      condition: 'above',
      value: 30,
    }]);
  };

  const updateTrigger = (id: string, field: string, value: any) => {
    setTriggers(triggers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTrigger = (id: string) => {
    setTriggers(triggers.filter(t => t.id !== id));
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

  const openDevicePicker = (type: 'trigger' | 'action', id: string) => {
    setDevicePickerFor({ type, id });
    setDevicePickerVisible(true);
  };

  const selectDevice = (deviceId: string) => {
    if (!devicePickerFor) return;
    
    if (devicePickerFor.type === 'trigger') {
      updateTrigger(devicePickerFor.id, 'deviceId', deviceId);
    } else {
      updateAction(devicePickerFor.id, 'deviceId', deviceId);
    }
    
    setDevicePickerVisible(false);
    setDevicePickerFor(null);
  };

  const handleSave = async () => {
    if (!automationName.trim()) {
      Alert.alert('Error', 'Please enter automation name');
      return;
    }

    if (triggers.length === 0) {
      Alert.alert('Error', 'Please add at least one trigger condition');
      return;
    }

    if (actions.length === 0) {
      Alert.alert('Error', 'Please add at least one action');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: automationName.trim(),
        triggers: triggers.map(({ id, ...rest }) => rest),
        triggerLogic,
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

  const renderTriggerCard = (trigger: Trigger) => {
    const triggerType = TRIGGER_TYPES.find(t => t.id === trigger.type);
    const selectedDevice = trigger.deviceId ? devices.find(d => d.id === trigger.deviceId) : null;
    const selectedSensor = trigger.sensorType ? SENSOR_TYPES.find(s => s.id === trigger.sensorType) : null;
    const selectedCondition = trigger.condition ? CONDITIONS.find(c => c.id === trigger.condition) : null;

    return (
      <View key={trigger.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>When</Text>
          <TouchableOpacity onPress={() => removeTrigger(trigger.id)}>
            <Trash2 size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>

        {/* Trigger Type Selector */}
        <Text style={styles.label}>Trigger Type</Text>
        <View style={styles.chipGroup}>
          {TRIGGER_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.chip, trigger.type === type.id && styles.chipActive]}
              onPress={() => updateTrigger(trigger.id, 'type', type.id)}
            >
              <Text style={[styles.chipText, trigger.type === type.id && styles.chipTextActive]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sensor Trigger */}
        {trigger.type === 'sensor' && (
          <>
            <Text style={styles.label}>Select Device</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => openDevicePicker('trigger', trigger.id)}
            >
              <Text style={styles.pickerText}>
                {selectedDevice ? selectedDevice.name : 'Choose device...'}
              </Text>
              <ChevronDown size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={styles.label}>Sensor Type</Text>
            <View style={styles.chipGroup}>
              {SENSOR_TYPES.map(sensor => (
                <TouchableOpacity
                  key={sensor.id}
                  style={[styles.chip, trigger.sensorType === sensor.id && styles.chipActive]}
                  onPress={() => updateTrigger(trigger.id, 'sensorType', sensor.id)}
                >
                  <Text style={[styles.chipText, trigger.sensorType === sensor.id && styles.chipTextActive]}>
                    {sensor.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Condition</Text>
            <View style={styles.conditionRow}>
              <View style={styles.conditionPicker}>
                {CONDITIONS.map(cond => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[styles.conditionChip, trigger.condition === cond.id && styles.conditionChipActive]}
                    onPress={() => updateTrigger(trigger.id, 'condition', cond.id)}
                  >
                    <Text style={[styles.conditionText, trigger.condition === cond.id && styles.conditionTextActive]}>
                      {cond.symbol} {cond.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.valueInput}
                value={trigger.value?.toString() || ''}
                onChangeText={(text) => updateTrigger(trigger.id, 'value', parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="Value"
                placeholderTextColor={colors.mutedForeground}
              />
              {selectedSensor && (
                <Text style={styles.unit}>{selectedSensor.unit}</Text>
              )}
            </View>
          </>
        )}

        {/* Device State Trigger */}
        {trigger.type === 'device_state' && (
          <>
            <Text style={styles.label}>Select Device</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => openDevicePicker('trigger', trigger.id)}
            >
              <Text style={styles.pickerText}>
                {selectedDevice ? selectedDevice.name : 'Choose device...'}
              </Text>
              <ChevronDown size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={styles.label}>State</Text>
            <View style={styles.chipGroup}>
              {DEVICE_STATE_CONDITIONS.map(state => (
                <TouchableOpacity
                  key={state.id}
                  style={[styles.chip, trigger.condition === state.id && styles.chipActive]}
                  onPress={() => updateTrigger(trigger.id, 'condition', state.id)}
                >
                  <Text style={[styles.chipText, trigger.condition === state.id && styles.chipTextActive]}>
                    {state.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Time Trigger */}
        {trigger.type === 'time' && (
          <>
            <Text style={styles.label}>Time</Text>
            <TextInput
              style={styles.input}
              value={trigger.at || '08:00'}
              onChangeText={(text) => updateTrigger(trigger.id, 'at', text)}
              placeholder="HH:MM"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        )}
      </View>
    );
  };

  const renderActionCard = (action: Action) => {
    const actionType = ACTION_TYPES.find(at => at.id === action.type);
    const selectedDevice = action.deviceId ? devices.find(d => d.id === action.deviceId) : null;
    const needsValue = action.type === 'set_value';

    return (
      <View key={action.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Then</Text>
          <TouchableOpacity onPress={() => removeAction(action.id)}>
            <Trash2 size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Action Type</Text>
        <View style={styles.chipGroup}>
          {ACTION_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.chip, action.type === type.id && styles.chipActive]}
              onPress={() => updateAction(action.id, 'type', type.id)}
            >
              <Text style={[styles.chipText, action.type === type.id && styles.chipTextActive]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Select Device</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => openDevicePicker('action', action.id)}
        >
          <Text style={styles.pickerText}>
            {selectedDevice ? selectedDevice.name : 'Choose device...'}
          </Text>
          <ChevronDown size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {needsValue && (
          <>
            <Text style={styles.label}>Value</Text>
            <TextInput
              style={styles.input}
              value={action.value?.toString() || ''}
              onChangeText={(text) => updateAction(action.id, 'value', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="Enter value"
              placeholderTextColor={colors.mutedForeground}
            />
          </>
        )}
      </View>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={automationId ? 'Edit Automation' : 'Create Automation'}
        showBack
        showSettings={false}
        rightComponent={
          automationId ? (
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={24} color={colors.destructive} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation Name</Text>
          <TextInput
            style={styles.input}
            value={automationName}
            onChangeText={setAutomationName}
            placeholder="e.g., Turn on AC when hot"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Enabled Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.sectionTitle}>Enabled</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
            />
          </View>
        </View>

        {/* Triggers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Triggers</Text>
            {triggers.length > 1 && (
              <View style={styles.logicToggle}>
                <TouchableOpacity
                  style={[styles.logicButton, triggerLogic === 'AND' && styles.logicButtonActive]}
                  onPress={() => setTriggerLogic('AND')}
                >
                  <Text style={[styles.logicButtonText, triggerLogic === 'AND' && styles.logicButtonTextActive]}>
                    AND
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logicButton, triggerLogic === 'OR' && styles.logicButtonActive]}
                  onPress={() => setTriggerLogic('OR')}
                >
                  <Text style={[styles.logicButtonText, triggerLogic === 'OR' && styles.logicButtonTextActive]}>
                    OR
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.sectionDescription}>
            {triggers.length > 1 
              ? `All conditions must be met (${triggerLogic}) to trigger this automation`
              : 'Add conditions that will trigger this automation'
            }
          </Text>

          {triggers.map(renderTriggerCard)}

          <TouchableOpacity style={styles.addButton} onPress={addTrigger}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Trigger</Text>
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Text style={styles.sectionDescription}>
            What should happen when the triggers are met
          </Text>

          {actions.map(renderActionCard)}

          <TouchableOpacity style={styles.addButton} onPress={addAction}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Action</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {automationId ? 'Update Automation' : 'Create Automation'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Device Picker Modal */}
      <Modal
        visible={devicePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDevicePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Device</Text>
              <TouchableOpacity onPress={() => setDevicePickerVisible(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.deviceList}>
              {devices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={styles.deviceItem}
                  onPress={() => selectDevice(device.id)}
                >
                  <Lightbulb size={20} color={colors.primary} />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceType}>{device.type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    sectionDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logicToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    logicButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    logicButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    logicButtonText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    logicButtonTextActive: {
      color: '#fff',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.primary,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    picker: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    pickerText: {
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    conditionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    conditionPicker: {
      flex: 1,
      gap: spacing.sm,
    },
    conditionChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    conditionChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    conditionText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    conditionTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    valueInput: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.foreground,
      width: 80,
      textAlign: 'center',
    },
    unit: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      width: 60,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    addButtonText: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.primary,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      marginTop: spacing.lg,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: '#fff',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
    },
    deviceList: {
      padding: spacing.lg,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      marginBottom: spacing.sm,
    },
    deviceInfo: {
      flex: 1,
    },
    deviceName: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
    },
    deviceType: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      textTransform: 'capitalize',
    },
  });
