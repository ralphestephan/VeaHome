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
  Clock,
  Zap,
  Droplets,
  Wind,
  Flame,
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
import type { Device } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    automationId?: string;
    homeId: string;
  };
};

type TriggerType = 'sensor' | 'time' | 'schedule' | 'sunrise' | 'sunset' | 'device_state' | 'geofence' | 'weather' | 'scene' | 'presence';
type TriggerOperator = 'AND' | 'OR';

interface Trigger {
  id: string;
  type: TriggerType;
  deviceId?: string;
  property?: string;
  condition?: string;
  value?: any;
  at?: string;
  days?: string[]; // For schedule triggers
  offset?: number; // Minutes offset for sunrise/sunset
  location?: { lat: number; lng: number; radius: number }; // For geofence
  weatherCondition?: string; // sunny, rainy, cloudy, etc.
  sceneId?: string; // For scene activation triggers
  userId?: string; // For presence triggers
  operator?: TriggerOperator;
}

interface Action {
  id: string;
  deviceId?: string;
  action?: string;
  property?: string;
  value?: any;
}

// Get device-specific trigger options based on device type
const getDeviceTriggerOptions = (device: Device | null) => {
  if (!device) return [];
  
  const options: Array<{id: string, name: string, conditions: Array<{id: string, name: string, needsValue?: boolean}>}> = [];
  
  switch (device.type) {
    case 'airguard':
      options.push({
        id: 'airQuality',
        name: 'Air Quality',
        conditions: [
          { id: 'is_good', name: 'Is Good' },
          { id: 'is_bad', name: 'Is Bad' },
        ]
      });
      options.push({
        id: 'temperature',
        name: 'Temperature',
        conditions: [
          { id: 'above', name: 'Above', needsValue: true },
          { id: 'below', name: 'Below', needsValue: true },
        ]
      });
      options.push({
        id: 'humidity',
        name: 'Humidity',
        conditions: [
          { id: 'above', name: 'Above', needsValue: true },
          { id: 'below', name: 'Below', needsValue: true },
        ]
      });
      options.push({
        id: 'pm25',
        name: 'PM2.5 (Dust)',
        conditions: [
          { id: 'above', name: 'Above', needsValue: true },
          { id: 'below', name: 'Below', needsValue: true },
        ]
      });
      options.push({
        id: 'mq2',
        name: 'Gas Level',
        conditions: [
          { id: 'above', name: 'Above', needsValue: true },
          { id: 'below', name: 'Below', needsValue: true },
        ]
      });
      break;
      
    case 'light':
    case 'ac':
    case 'fan':
    case 'thermostat':
      options.push({
        id: 'state',
        name: 'Power State',
        conditions: [
          { id: 'is_on', name: 'Is ON' },
          { id: 'is_off', name: 'Is OFF' },
        ]
      });
      break;
      
    case 'sensor':
      options.push({
        id: 'value',
        name: 'Sensor Value',
        conditions: [
          { id: 'above', name: 'Above', needsValue: true },
          { id: 'below', name: 'Below', needsValue: true },
          { id: 'equals', name: 'Equals', needsValue: true },
        ]
      });
      break;
  }
  
  return options;
};

// Get device-specific actions based on device type and capabilities
const getDeviceActionOptions = (device: Device | null) => {
  if (!device) return [];
  
  const actions: Array<{id: string, name: string, needsValue?: boolean, valueType?: string}> = [];
  
  switch (device.type) {
    case 'airguard':
      actions.push(
        { id: 'mute_buzzer', name: 'Mute Buzzer' },
        { id: 'unmute_buzzer', name: 'Unmute Buzzer' },
        { id: 'set_thresholds', name: 'Set Thresholds', needsValue: true, valueType: 'thresholds' },
      );
      break;
      
    case 'light':
      actions.push(
        { id: 'turn_on', name: 'Turn ON' },
        { id: 'turn_off', name: 'Turn OFF' },
      );
      break;
      
    case 'ac':
    case 'thermostat':
      actions.push(
        { id: 'turn_on', name: 'Turn ON' },
        { id: 'turn_off', name: 'Turn OFF' },
        { id: 'set_temperature', name: 'Set Temperature', needsValue: true, valueType: 'number' },
      );
      break;
      
    case 'fan':
      actions.push(
        { id: 'turn_on', name: 'Turn ON' },
        { id: 'turn_off', name: 'Turn OFF' },
        { id: 'set_speed', name: 'Set Speed', needsValue: true, valueType: 'number' },
      );
      break;
  }
  
  return actions;
};

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
  
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

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
        
        if (automation.triggers && Array.isArray(automation.triggers)) {
          setTriggers(automation.triggers.map((t: any, idx: number) => ({
            id: `trigger_${idx}`,
            operator: idx < automation.triggers.length - 1 ? (t.operator || 'AND') : undefined,
            ...t,
          })));
        }
        
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
      operator: 'AND',
    }]);
  };

  const updateTrigger = (id: string, field: string, value: any) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const updateTriggerMultiple = (id: string, updates: Record<string, any>) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTrigger = (id: string) => {
    setTriggers(triggers.filter(t => t.id !== id));
  };

  const addAction = () => {
    setActions([...actions, {
      id: `action_${Date.now()}`,
    }]);
  };

  const updateAction = (id: string, field: string, value: any) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const updateActionMultiple = (id: string, updates: Record<string, any>) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
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
      setTriggers(triggers.map(t => 
        t.id === devicePickerFor.id 
          ? { ...t, deviceId, property: undefined, condition: undefined, value: undefined } 
          : t
      ));
    } else {
      setActions(actions.map(a => 
        a.id === devicePickerFor.id 
          ? { ...a, deviceId, action: undefined, property: undefined, value: undefined } 
          : a
      ));
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

    for (const trigger of triggers) {
      if (trigger.type === 'sensor' && !trigger.deviceId) {
        Alert.alert('Error', 'Please select a device for all triggers');
        return;
      }
      if (trigger.type === 'sensor' && !trigger.property) {
        Alert.alert('Error', 'Please select what to monitor for all triggers');
        return;
      }
      if (trigger.type === 'sensor' && !trigger.condition) {
        Alert.alert('Error', 'Please select a condition for all triggers');
        return;
      }
    }

    for (const action of actions) {
      if (!action.deviceId) {
        Alert.alert('Error', 'Please select a device for all actions');
        return;
      }
      if (!action.action) {
        Alert.alert('Error', 'Please select an action');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: automationName.trim(),
        triggers: triggers.map(({ id, ...rest }) => rest),
        actions: actions.map(({ id, ...rest }) => rest),
        enabled,
      };

      console.log('[AutomationForm] Saving automation with payload:', JSON.stringify(payload, null, 2));

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
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save automation';
      Alert.alert('Error', errorMessage);
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

  const renderTriggerCard = (trigger: Trigger, index: number) => {
    const selectedDevice = trigger.deviceId ? devices.find(d => d.id === trigger.deviceId) : null;
    const triggerOptions = getDeviceTriggerOptions(selectedDevice || null);
    const selectedProperty = triggerOptions.find(opt => opt.id === trigger.property);
    const selectedCondition = selectedProperty?.conditions.find(c => c.id === trigger.condition);
    const needsValue = selectedCondition?.needsValue || false;
    const isLastTrigger = index === triggers.length - 1;

    return (
      <View key={trigger.id}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>When</Text>
            <TouchableOpacity onPress={() => removeTrigger(trigger.id)}>
              <Trash2 size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>

          {/* Trigger Type Selector */}
          <Text style={styles.label}>Trigger Type</Text>
          <View style={styles.chipGroup}>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'sensor' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'sensor', deviceId: undefined, property: undefined, condition: undefined, value: undefined })}
            >
              <Text style={[styles.chipText, trigger.type === 'sensor' && styles.chipTextActive]}>Sensor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'time' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'time', at: '08:00' })}
            >
              <Text style={[styles.chipText, trigger.type === 'time' && styles.chipTextActive]}>Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'schedule' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'schedule', at: '08:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })}
            >
              <Text style={[styles.chipText, trigger.type === 'schedule' && styles.chipTextActive]}>Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'sunrise' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'sunrise', offset: 0 })}
            >
              <Text style={[styles.chipText, trigger.type === 'sunrise' && styles.chipTextActive]}>Sunrise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'sunset' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'sunset', offset: 0 })}
            >
              <Text style={[styles.chipText, trigger.type === 'sunset' && styles.chipTextActive]}>Sunset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'device_state' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'device_state', deviceId: undefined, condition: 'turns_on' })}
            >
              <Text style={[styles.chipText, trigger.type === 'device_state' && styles.chipTextActive]}>Device State</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, trigger.type === 'weather' && styles.chipActive]}
              onPress={() => updateTriggerMultiple(trigger.id, { type: 'weather', weatherCondition: 'sunny' })}
            >
              <Text style={[styles.chipText, trigger.type === 'weather' && styles.chipTextActive]}>Weather</Text>
            </TouchableOpacity>
          </View>

          {trigger.type === 'sensor' && (
            <>
              <Text style={styles.label}>Select Device</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => openDevicePicker('trigger', trigger.id)}
              >
                <Text style={[styles.pickerText, !selectedDevice && styles.pickerPlaceholder]}>
                  {selectedDevice ? selectedDevice.name : 'Choose device...'}
                </Text>
                <ChevronDown size={20} color={colors.mutedForeground} />
              </TouchableOpacity>

              {selectedDevice && triggerOptions.length > 0 && (
                <>
                  <Text style={styles.label}>Monitor</Text>
                  <View style={styles.chipGroup}>
                    {triggerOptions.map(opt => (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.chip, trigger.property === opt.id && styles.chipActive]}
                        onPress={() => {
                          updateTriggerMultiple(trigger.id, {
                            property: opt.id,
                            condition: undefined,
                            value: undefined
                          });
                        }}
                      >
                        <Text style={[styles.chipText, trigger.property === opt.id && styles.chipTextActive]}>
                          {opt.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {selectedProperty && (
                <>
                  <Text style={styles.label}>Condition</Text>
                  <View style={styles.chipGroup}>
                    {selectedProperty.conditions.map(cond => (
                      <TouchableOpacity
                        key={cond.id}
                        style={[styles.chip, trigger.condition === cond.id && styles.chipActive]}
                        onPress={() => {
                          updateTrigger(trigger.id, 'condition', cond.id);
                          if (!cond.needsValue) {
                            updateTrigger(trigger.id, 'value', undefined);
                          }
                        }}
                      >
                        <Text style={[styles.chipText, trigger.condition === cond.id && styles.chipTextActive]}>
                          {cond.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {needsValue && trigger.condition && (
                <>
                  <Text style={styles.label}>Value</Text>
                  <TextInput
                    style={styles.input}
                    value={trigger.value?.toString() || ''}
                    onChangeText={(text) => updateTrigger(trigger.id, 'value', parseFloat(text) || 0)}
                    keyboardType="numeric"
                    placeholder={`Enter ${selectedProperty?.name.toLowerCase()} value`}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}
            </>
          )}

          {trigger.type === 'time' && (
            <>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={trigger.at || ''}
                onChangeText={(text) => updateTrigger(trigger.id, 'at', text)}
                placeholder="08:00"
                placeholderTextColor={colors.mutedForeground}
              />
            </>
          )}

          {trigger.type === 'schedule' && (
            <>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={trigger.at || ''}
                onChangeText={(text) => updateTrigger(trigger.id, 'at', text)}
                placeholder="08:00"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={styles.label}>Days</Text>
              <View style={styles.chipGroup}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const isSelected = (trigger.days || []).includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        const currentDays = trigger.days || [];
                        const newDays = isSelected
                          ? currentDays.filter(d => d !== day)
                          : [...currentDays, day];
                        updateTrigger(trigger.id, 'days', newDays);
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {(trigger.type === 'sunrise' || trigger.type === 'sunset') && (
            <>
              <Text style={styles.label}>Offset (minutes before/after)</Text>
              <TextInput
                style={styles.input}
                value={trigger.offset?.toString() || '0'}
                onChangeText={(text) => updateTrigger(trigger.id, 'offset', parseInt(text) || 0)}
                placeholder="0 = exact time, +30 = 30 min after, -30 = 30 min before"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </>
          )}

          {trigger.type === 'device_state' && (
            <>
              <Text style={styles.label}>Select Device</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => openDevicePicker('trigger', trigger.id)}
              >
                <Text style={[styles.pickerText, !selectedDevice && styles.pickerPlaceholder]}>
                  {selectedDevice ? selectedDevice.name : 'Choose device...'}
                </Text>
                <ChevronDown size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              {selectedDevice && (
                <>
                  <Text style={styles.label}>State Change</Text>
                  <View style={styles.chipGroup}>
                    <TouchableOpacity
                      style={[styles.chip, trigger.condition === 'turns_on' && styles.chipActive]}
                      onPress={() => updateTrigger(trigger.id, 'condition', 'turns_on')}
                    >
                      <Text style={[styles.chipText, trigger.condition === 'turns_on' && styles.chipTextActive]}>Turns ON</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, trigger.condition === 'turns_off' && styles.chipActive]}
                      onPress={() => updateTrigger(trigger.id, 'condition', 'turns_off')}
                    >
                      <Text style={[styles.chipText, trigger.condition === 'turns_off' && styles.chipTextActive]}>Turns OFF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chip, trigger.condition === 'state_changes' && styles.chipActive]}
                      onPress={() => updateTrigger(trigger.id, 'condition', 'state_changes')}
                    >
                      <Text style={[styles.chipText, trigger.condition === 'state_changes' && styles.chipTextActive]}>Any Change</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          {trigger.type === 'weather' && (
            <>
              <Text style={styles.label}>Weather Condition</Text>
              <View style={styles.chipGroup}>
                {[
                  { id: 'sunny', name: 'Sunny' },
                  { id: 'cloudy', name: 'Cloudy' },
                  { id: 'rainy', name: 'Rainy' },
                  { id: 'stormy', name: 'Stormy' },
                  { id: 'snowy', name: 'Snowy' },
                  { id: 'foggy', name: 'Foggy' },
                ].map(weather => (
                  <TouchableOpacity
                    key={weather.id}
                    style={[styles.chip, trigger.weatherCondition === weather.id && styles.chipActive]}
                    onPress={() => updateTrigger(trigger.id, 'weatherCondition', weather.id)}
                  >
                    <Text style={[styles.chipText, trigger.weatherCondition === weather.id && styles.chipTextActive]}>
                      {weather.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {!isLastTrigger && (
          <View style={styles.operatorRow}>
            <View style={styles.operatorLine} />
            <View style={styles.operatorToggle}>
              <TouchableOpacity
                style={[styles.operatorButton, trigger.operator === 'AND' && styles.operatorButtonActive]}
                onPress={() => updateTrigger(trigger.id, 'operator', 'AND')}
              >
                <Text style={[styles.operatorButtonText, trigger.operator === 'AND' && styles.operatorButtonTextActive]}>
                  AND
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.operatorButton, trigger.operator === 'OR' && styles.operatorButtonActive]}
                onPress={() => updateTrigger(trigger.id, 'operator', 'OR')}
              >
                <Text style={[styles.operatorButtonText, trigger.operator === 'OR' && styles.operatorButtonTextActive]}>
                  OR
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.operatorLine} />
          </View>
        )}
      </View>
    );
  };

  const renderActionCard = (action: Action) => {
    const selectedDevice = action.deviceId ? devices.find(d => d.id === action.deviceId) : null;
    const actionOptions = getDeviceActionOptions(selectedDevice || null);
    const selectedAction = actionOptions.find(a => a.id === action.action);
    const needsValue = selectedAction?.needsValue || false;

    return (
      <View key={action.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Then</Text>
          <TouchableOpacity onPress={() => removeAction(action.id)}>
            <Trash2 size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Select Device</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => openDevicePicker('action', action.id)}
        >
          <Text style={[styles.pickerText, !selectedDevice && styles.pickerPlaceholder]}>
            {selectedDevice ? selectedDevice.name : 'Choose device...'}
          </Text>
          <ChevronDown size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {selectedDevice && actionOptions.length > 0 && (
          <>
            <Text style={styles.label}>Action</Text>
            <View style={styles.chipGroup}>
              {actionOptions.map(act => (
                <TouchableOpacity
                  key={act.id}
                  style={[styles.chip, action.action === act.id && styles.chipActive]}
                  onPress={() => {
                    updateActionMultiple(action.id, {
                      action: act.id,
                      value: act.needsValue ? undefined : action.value
                    });
                  }}
                >
                  <Text style={[styles.chipText, action.action === act.id && styles.chipTextActive]}>
                    {act.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {needsValue && action.action && (
          <>
            {selectedAction?.valueType === 'thresholds' ? (
              <View style={styles.thresholdContainer}>
                <Text style={styles.label}>Alert Thresholds</Text>
                <Text style={styles.helperText}>Set min/max values that will trigger alerts</Text>
                
                {/* Temperature */}
                <View style={styles.thresholdRow}>
                  <Thermometer size={18} color={colors.primary} />
                  <Text style={styles.thresholdLabel}>Temperature (°C)</Text>
                </View>
                <View style={styles.minMaxRow}>
                  <View style={styles.minMaxInput}>
                    <Text style={styles.minMaxLabel}>Min</Text>
                    <TextInput
                      style={styles.input}
                      value={action.value?.tempMin?.toString() || ''}
                      onChangeText={(text) => updateAction(action.id, 'value', {
                        ...(action.value || {}),
                        tempMin: parseFloat(text) || 0
                      })}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.minMaxInput}>
                    <Text style={styles.minMaxLabel}>Max</Text>
                    <TextInput
                      style={styles.input}
                      value={action.value?.tempMax?.toString() || ''}
                      onChangeText={(text) => updateAction(action.id, 'value', {
                        ...(action.value || {}),
                        tempMax: parseFloat(text) || 0
                      })}
                      keyboardType="numeric"
                      placeholder="35"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                {/* Humidity */}
                <View style={styles.thresholdRow}>
                  <Droplets size={18} color={colors.primary} />
                  <Text style={styles.thresholdLabel}>Humidity (%)</Text>
                </View>
                <View style={styles.minMaxRow}>
                  <View style={styles.minMaxInput}>
                    <Text style={styles.minMaxLabel}>Min</Text>
                    <TextInput
                      style={styles.input}
                      value={action.value?.humMin?.toString() || ''}
                      onChangeText={(text) => updateAction(action.id, 'value', {
                        ...(action.value || {}),
                        humMin: parseFloat(text) || 0
                      })}
                      keyboardType="numeric"
                      placeholder="20"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.minMaxInput}>
                    <Text style={styles.minMaxLabel}>Max</Text>
                    <TextInput
                      style={styles.input}
                      value={action.value?.humMax?.toString() || ''}
                      onChangeText={(text) => updateAction(action.id, 'value', {
                        ...(action.value || {}),
                        humMax: parseFloat(text) || 0
                      })}
                      keyboardType="numeric"
                      placeholder="80"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                {/* Dust (PM2.5) */}
                <View style={styles.thresholdRow}>
                  <Wind size={18} color={colors.primary} />
                  <Text style={styles.thresholdLabel}>Dust/PM2.5 (µg/m³)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={action.value?.dustHigh?.toString() || ''}
                  onChangeText={(text) => updateAction(action.id, 'value', {
                    ...(action.value || {}),
                    dustHigh: parseFloat(text) || 0
                  })}
                  keyboardType="numeric"
                  placeholder="Max: 100"
                  placeholderTextColor={colors.mutedForeground}
                />

                {/* Gas (MQ2) */}
                <View style={styles.thresholdRow}>
                  <Flame size={18} color={colors.primary} />
                  <Text style={styles.thresholdLabel}>Gas Level (MQ2)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={action.value?.mq2High?.toString() || ''}
                  onChangeText={(text) => updateAction(action.id, 'value', {
                    ...(action.value || {}),
                    mq2High: parseFloat(text) || 0
                  })}
                  keyboardType="numeric"
                  placeholder="Max: 300"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ) : (
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
        rightContent={
          automationId ? (
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={24} color={colors.destructive} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation Name</Text>
          <TextInput
            style={styles.input}
            value={automationName}
            onChangeText={setAutomationName}
            placeholder="e.g., Turn on AC when air quality is bad"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Triggers</Text>
          <Text style={styles.sectionDescription}>
            Add conditions with individual AND/OR logic between each
          </Text>

          {triggers.map((trigger, index) => renderTriggerCard(trigger, index))}

          <TouchableOpacity style={styles.addButton} onPress={addTrigger}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Trigger</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Text style={styles.sectionDescription}>
            What should happen when triggers are met
          </Text>

          {actions.map(renderActionCard)}

          <TouchableOpacity style={styles.addButton} onPress={addAction}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Action</Text>
          </TouchableOpacity>
        </View>

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
                  <Zap size={20} color={colors.primary} />
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
    pickerPlaceholder: {
      color: colors.mutedForeground,
    },
    operatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
      gap: spacing.md,
    },
    operatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    operatorToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    operatorButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    operatorButtonActive: {
      backgroundColor: colors.primary,
    },
    operatorButtonText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    operatorButtonTextActive: {
      color: '#fff',
    },
    thresholdsInput: {
      gap: spacing.sm,
    },
    helperText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
    thresholdContainer: {
      gap: spacing.md,
      marginTop: spacing.md,
    },
    thresholdRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    thresholdLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.foreground,
    },
    minMaxRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    minMaxInput: {
      flex: 1,
    },
    minMaxLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      marginBottom: spacing.xs,
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
