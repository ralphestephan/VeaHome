import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDemo } from '../context/DemoContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useHomeData } from '../hooks/useHomeData';
import { getApiClient, ScenesApi, AutomationsApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Edit,
  Lightbulb,
  Fan,
  Music,
  Target,
  CheckCircle,
  Clock,
  Play,
  LucideIcon,
  Coffee,
  Book,
  Dumbbell,
  Baby,
  Tv,
  Wind,
  Shield,
  Home,
  Calendar,
  TrendingUp,
  Bell,
  AlertCircle,
  Zap,
  Sun,
  Moon,
  Film,
  PartyPopper,
  UserX,
  BedDouble,
  Briefcase,
  UtensilsCrossed,
  Thermometer,
  Lock,
  Camera,
  Speaker,
  Power,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';
import Header from '../components/Header';
import { useToast } from '../components/Toast';

// Icon mapping for scenes
const sceneIconMap: Record<string, LucideIcon> = {
  'weather-sunset-up': Sun,
  'sun': Clock,
  'weather-sunset': UtensilsCrossed,
  'weather-night': Moon,
  'movie': Film,
  'party-popper': PartyPopper,
  'account-off': UserX,
  'bed': BedDouble,
  'briefcase': Briefcase,
  'silverware-fork-knife': UtensilsCrossed,
  'book-open': Book,
  'dumbbell': Dumbbell,
  'coffee': Coffee,
  'music': Music,
  'tv': Tv,
  'wind': Wind,
  'lightbulb': Lightbulb,
  'shield': Shield,
  'home': Home,
  'calendar': Calendar,
  'trending-up': TrendingUp,
  'bell': Bell,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'target': Target,
  'zap': Zap,
  // New icons for demo scenes
  'sunrise': Sun,
  'sunset': Sun,
  'moon': Moon,
  'film': Film,
  'power': Zap,
  'Sun': Sun,
  'Moon': Moon,
};

// Icon mapping for device types in scene actions
const deviceTypeIconMap: Record<string, LucideIcon> = {
  light: Lightbulb,
  ac: Thermometer,
  thermostat: Thermometer,
  airguard: Wind,
  fan: Fan,
  lock: Lock,
  camera: Camera,
  tv: Tv,
  speaker: Speaker,
  music: Music,
};

interface Scene {
  id: string;
  name: string;
  icon: string;
  devices: number;
  isActive: boolean;
  time?: string;
  description?: string;
  deviceCount?: number;
  device_states?: any;
  deviceStates?: any;
  schedule?: string;
}

interface AutomationPreview {
  id: string;
  name: string;
  isActive: boolean;
  trigger?: {
    type?: string;
    at?: string;
    days?: string[];
    sensor?: string;
  };
  actions: any[];
  devices: any[];
  conditions: any[];
  lastRunAt?: string;
  summary?: string;
}

const mockAutomations: AutomationPreview[] = [
  {
    id: 'auto-1',
    name: 'Wake Up Lights',
    isActive: true,
    trigger: { type: 'schedule', at: '06:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    actions: [{ type: 'light', value: 'Warm 60%' }],
    devices: [{ name: 'Bedroom Lamps' }, { name: 'Kitchen Spots' }],
    conditions: [{ type: 'sunrise' }],
    summary: 'Softly fades lights and starts morning playlist.',
  },
  {
    id: 'auto-2',
    name: 'Night Security Sweep',
    isActive: false,
    trigger: { type: 'schedule', at: '23:00' },
    actions: [{ type: 'lock', value: 'Lock all doors' }, { type: 'camera', value: 'Enable guard mode' }],
    devices: [{ name: 'Perimeter Locks' }, { name: 'Driveway Camera' }],
    conditions: [{ type: 'occupancy', value: 'Away' }],
    summary: 'Locks doors and arms cameras if everyone is away.',
  },
];

const ensureArray = (value: any) => (Array.isArray(value) ? value : []);

const normalizeAutomations = (list: any[]): AutomationPreview[] => {
  if (!Array.isArray(list)) return [];
  return list.map((automation, idx) => {
    // Handle both old format (trigger) and new format (triggers/conditions)
    let trigger = undefined;
    let conditions: any[] = [];

    if (automation?.trigger && typeof automation.trigger === 'object') {
      // Check if it's the new format with conditions array
      if (automation.trigger.conditions && Array.isArray(automation.trigger.conditions) && automation.trigger.conditions.length > 0) {
        // Extract conditions array
        conditions = automation.trigger.conditions;
        // Extract first condition as the main trigger
        const firstCondition = automation.trigger.conditions[0];
        trigger = {
          type: firstCondition.type || 'custom',
          at: firstCondition.at,
          days: firstCondition.days,
          sensor: firstCondition.sensor,
          deviceId: firstCondition.deviceId,
        };
      } else {
        // Old format - use as is
        trigger = automation.trigger;
        if (automation.trigger && typeof automation.trigger === 'object') {
          conditions = [automation.trigger]; // Single trigger as a condition
        }
      }
    } else if (automation?.triggers && Array.isArray(automation.triggers) && automation.triggers.length > 0) {
      // New format with triggers array
      conditions = automation.triggers;
      const firstTrigger = automation.triggers[0];
      trigger = {
        type: firstTrigger.type || 'custom',
        at: firstTrigger.at,
        days: firstTrigger.days,
        sensor: firstTrigger.sensor,
        deviceId: firstTrigger.deviceId,
      };
    }

    // Extract devices from actions (unique deviceIds)
    const actions = ensureArray(automation?.actions);
    const deviceIds = new Set<string>();
    actions.forEach((action: any) => {
      if (action.deviceId) {
        deviceIds.add(action.deviceId);
      }
    });
    const devices = Array.from(deviceIds).map((deviceId: string) => ({ id: deviceId }));

    return {
      id: automation?.id || `automation-${idx}`,
      name: automation?.name || 'Untitled automation',
      isActive: Boolean(automation?.isActive || automation?.enabled),
      trigger,
      actions,
      devices: devices.length > 0 ? devices : ensureArray(automation?.devices), // Fallback to automation.devices if no devices found in actions
      conditions: conditions.length > 0 ? conditions : ensureArray(automation?.conditions), // Use extracted conditions or fallback
      lastRunAt: automation?.lastRunAt,
      summary: typeof automation?.summary === 'string' ? automation.summary : undefined,
    };
  });
};

const toSentenceCase = (value?: string) => {
  if (!value || typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatTriggerLabel = (automation: AutomationPreview) => {
  const parts: string[] = [];
  if (automation.trigger?.type) parts.push(toSentenceCase(automation.trigger.type));
  if (automation.trigger?.at) parts.push(automation.trigger.at);
  if (Array.isArray(automation.trigger?.days) && automation.trigger?.days.length) {
    parts.push(automation.trigger.days.join(' · '));
  }
  if (automation.trigger?.sensor) parts.push(automation.trigger.sensor);
  return parts.join(' • ') || 'No trigger configured yet';
};

const describeList = (items: any[], singular: string, plural: string) => {
  if (!items.length) return `0 ${plural}`;
  if (items.length === 1) return `1 ${singular}`;
  return `${items.length} ${plural}`;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScenesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { scenes: demoScenes, activateScene: demoActivateScene } = useDemo();
  const homeId = user?.homeId;
  const isDemoMode = token === 'DEMO_TOKEN';
  const { devices, refresh: refreshHomeData } = useHomeData(homeId || '');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<AutomationPreview[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const featuredAutomation = automations[0] || null;
  const otherAutomations = automations.slice(1);
  const { showToast } = useToast();

  const client = getApiClient(async () => token);
  const scenesApi = ScenesApi(client);
  const automationsApi = AutomationsApi(client);

  useEffect(() => {
    loadScenes();
    loadAutomations();
  }, [homeId, isDemoMode]);

  const loadAutomations = async () => {
    if (!homeId) {
      setAutomations(mockAutomations);
      setAutomationError(null);
      return;
    }

    try {
      setAutomationLoading(true);
      const response = await automationsApi.listAutomations(homeId).catch(() => ({ data: [] } as any));
      const raw = (response as any)?.data;
      const payload =
        raw?.data?.automations ?? raw?.automations ?? raw?.data ?? raw;
      const list = Array.isArray(payload) ? payload : [];

      if (!Array.isArray(payload)) {
        console.warn('Unexpected automation payload', raw);
        setAutomationError('Automation payload looked different than expected.');
      } else if (!list.length) {
        setAutomationError('No automations configured yet.');
      } else {
        setAutomationError(null);
      }

      // Show all automations (including invalid ones) so user can delete them
      setAutomations(normalizeAutomations(list));
    } catch (e) {
      console.error('Error loading automations:', e);
      setAutomations([]);
      setAutomationError('Unable to load automations right now.');
    } finally {
      setAutomationLoading(false);
    }
  };

  const loadScenes = async () => {
    if (isDemoMode) {
      // Use demo scenes from context
      const mappedScenes: Scene[] = demoScenes.map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        devices: s.deviceActions?.length || 0,
        isActive: s.isActive,
        time: s.schedule,
        description: s.description,
      }));
      setScenes(mappedScenes);
      setLoading(false);
      return;
    }

    if (!homeId) {
      // No home ID - show empty state
      setScenes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await scenesApi.listScenes(homeId);
      const raw = (response as any)?.data;
      const payload = raw?.data?.scenes ?? raw?.scenes ?? raw?.data ?? raw;
      setScenes(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error('Error loading scenes:', e);
      // Fallback to empty array
      setScenes([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh scenes when screen comes into focus (e.g., after creating/editing a scene)
  useFocusEffect(
    useCallback(() => {
      if (homeId || isDemoMode) {
        loadScenes();
      }
    }, [homeId, isDemoMode])
  );

  const toggleScene = async (id: string) => {
    if (isDemoMode) {
      // Use demo context to activate scene
      demoActivateScene(id);
      const scene = demoScenes.find(s => s.id === id);
      if (scene) {
        showToast(`${scene.name} activated`, { type: 'success' });
      }
      // Update local state to reflect changes
      setScenes(prev => prev.map(s => ({
        ...s,
        isActive: s.id === id,
      })));
      return;
    }

    if (!homeId) {
      // Local state only if no homeId
      const nextScenes = scenes.map(scene =>
        scene.id === id
          ? { ...scene, isActive: !scene.isActive }
          : { ...scene, isActive: false }
      );
      setScenes(nextScenes);
      const updatedScene = nextScenes.find(scene => scene.id === id);
      if (updatedScene) {
        showToast(`${updatedScene.name} ${updatedScene.isActive ? 'activated' : 'paused'}`, {
          type: updatedScene.isActive ? 'success' : 'info',
        });
      }
      return;
    }

    try {
      const scene = scenes.find(s => s.id === id);
      const isCurrentlyActive = scene?.isActive === true || scene?.is_active === true;

      if (scene && isCurrentlyActive) {
        // Deactivate scene
        await scenesApi.deactivateScene(homeId, id);
        showToast(`"${scene.name}" deactivated`, { type: 'info' });
      } else if (scene) {
        // Activate scene
        await scenesApi.activateScene(homeId, id);
        showToast(`"${scene.name}" activated`, { type: 'success' });
      }

      // Refresh scenes to get updated state from backend
      await loadScenes();
      // Also refresh home data to update rooms with active scene
      await refreshHomeData();
      // Refresh scenes one more time to ensure sync
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadScenes();
    } catch (e: any) {
      console.error('[ScenesScreen] Scene activation error:', e);
      console.error('[ScenesScreen] Error response:', e?.response?.data);
      showToast(e?.response?.data?.message || 'Failed to toggle scene', { type: 'error' });
      // Still refresh to ensure UI is in sync
      await loadScenes();
    }
  };

  const handleCreateScene = () => {
    if (!homeId) {
      showToast('Please set up your home first', { type: 'error' });
      return;
    }
    navigation.navigate('SceneForm', { homeId });
  };

  const handleEditScene = (sceneId: string) => {
    if (!homeId) return;
    navigation.navigate('SceneForm', { sceneId, homeId });
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (!homeId) return;

    Alert.alert(
      'Delete Scene',
      'Are you sure you want to delete this scene?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await scenesApi.deleteScene(homeId, sceneId);
              await loadScenes();
              showToast('Scene deleted', { type: 'success' });
            } catch (e: any) {
              showToast(e?.response?.data?.message || 'Failed to delete scene', { type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleToggleAutomation = async (automation?: AutomationPreview | null) => {
    if (!homeId || !automation) {
      navigation.navigate('Automations');
      return;
    }

    try {
      setAutomationLoading(true);
      const nextState = !automation.isActive;
      // Use 'enabled' field to match backend API expectation
      await automationsApi.updateAutomation(homeId, automation.id, {
        enabled: nextState,
      });
      setAutomations(prev => prev.map(item =>
        item.id === automation.id ? { ...item, isActive: nextState } : item
      ));
      showToast(
        `Automation ${nextState ? 'enabled' : 'paused'}`,
        { type: 'success' }
      );
    } catch (e: any) {
      console.error('Toggle automation error:', e?.response?.data);
      const errorMsg = e?.response?.data?.message || e?.response?.data?.error || 'Failed to update automation';
      showToast(errorMsg, { type: 'error' });
      // If toggle fails with 400, the automation might be invalid
      if (e?.response?.status === 400) {
        Alert.alert(
          'Invalid Automation',
          'This automation appears to be invalid (missing triggers or actions). Would you like to delete it?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await automationsApi.deleteAutomation(homeId, automation.id);
                  await loadAutomations();
                  showToast('Invalid automation deleted', { type: 'success' });
                } catch (deleteErr) {
                  showToast('Failed to delete automation', { type: 'error' });
                }
              },
            },
          ]
        );
      }
    } finally {
      setAutomationLoading(false);
    }
  };

  const activeScenes = scenes.filter(s => s.isActive === true || s.is_active === true);
  const inactiveScenes = scenes.filter(s => !(s.isActive === true || s.is_active === true));

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Scenes" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scenes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Scenes" />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{activeScenes.length} active • {inactiveScenes.length} available</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateScene}>
          <Plus size={16} color="white" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active Scene */}
        {activeScenes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            {activeScenes.map(scene => (
              <LinearGradient
                key={scene.id}
                colors={gradients.accent}
                style={styles.activeSceneCard}
              >
                <View style={styles.activeSceneHeader}>
                  <View style={styles.activeSceneInfo}>
                    <View style={styles.activeSceneIcon}>
                      {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 28, color: "white" })}
                    </View>
                    <View style={styles.activeSceneContent}>
                      <Text style={styles.activeSceneName}>{scene.name}</Text>
                      <Text style={styles.activeSceneDetails}>
                        {(() => {
                          // Count devices from deviceTypeRules (new format) or deviceStates (old format)
                          if (scene.deviceTypeRules || scene.device_type_rules) {
                            const rules = scene.deviceTypeRules || scene.device_type_rules || [];
                            let totalDevices = 0;

                            rules.forEach((rule: any) => {
                              if (rule.mode === 'specific' && rule.deviceIds) {
                                totalDevices += rule.deviceIds.length;
                              } else if (rule.mode === 'all') {
                                const typeDevices = devices?.filter((d: any) => d.type === rule.type) || [];
                                totalDevices += typeDevices.length;
                              }
                            });

                            return totalDevices;
                          }

                          return Object.keys(scene.device_states || scene.deviceStates || {}).length;
                        })()} devices active • {scene.description || 'Custom scene'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activeSceneActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => toggleScene(scene.id)}
                    >
                      <Power size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditScene(scene.id)}
                    >
                      <Edit size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.activeSceneControls}>
                  {(() => {
                    // Extract actions from deviceTypeRules or deviceStates
                    const actions: Array<{ type: string; icon: LucideIcon; label: string }> = [];

                    if (scene.deviceTypeRules || scene.device_type_rules) {
                      const rules = scene.deviceTypeRules || scene.device_type_rules || [];
                      rules.forEach((rule: any) => {
                        const IconComponent = deviceTypeIconMap[rule.type] || Lightbulb;
                        let label = '';

                        if (rule.state) {
                          if (rule.type === 'light' && typeof rule.state.value === 'number') {
                            label = `Lights: ${rule.state.value}%`;
                          } else if ((rule.type === 'ac' || rule.type === 'thermostat') && typeof rule.state.value === 'number') {
                            label = `Temp: ${rule.state.value}°C`;
                          } else if (rule.type === 'airguard' && typeof rule.state.buzzer === 'boolean') {
                            label = `Buzzer: ${rule.state.buzzer ? 'On' : 'Off'}`;
                          } else if (typeof rule.state.isActive === 'boolean') {
                            const typeName = rule.type.charAt(0).toUpperCase() + rule.type.slice(1);
                            label = `${typeName}: ${rule.state.isActive ? 'On' : 'Off'}`;
                          } else if (rule.type === 'lock' && typeof rule.state.isActive === 'boolean') {
                            label = `Lock: ${rule.state.isActive ? 'Locked' : 'Unlocked'}`;
                          }
                        }

                        if (label) {
                          actions.push({ type: rule.type, icon: IconComponent, label });
                        }
                      });
                    } else if (scene.device_states || scene.deviceStates) {
                      const deviceStates = scene.device_states || scene.deviceStates || {};
                      Object.entries(deviceStates).forEach(([deviceId, state]: [string, any]) => {
                        // Try to find device type from devices list
                        const device = devices?.find((d: any) => d.id === deviceId);
                        const deviceType = device?.type || 'light';
                        const IconComponent = deviceTypeIconMap[deviceType] || Lightbulb;
                        let label = '';

                        if (deviceType === 'light' && typeof state.value === 'number') {
                          label = `Lights: ${state.value}%`;
                        } else if ((deviceType === 'ac' || deviceType === 'thermostat') && typeof state.value === 'number') {
                          label = `Temp: ${state.value}°C`;
                        } else if (deviceType === 'airguard' && typeof state.buzzer === 'boolean') {
                          label = `Buzzer: ${state.buzzer ? 'On' : 'Off'}`;
                        } else if (typeof state.isActive === 'boolean') {
                          const typeName = deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
                          label = `${typeName}: ${state.isActive ? 'On' : 'Off'}`;
                        }

                        if (label && !actions.find(a => a.type === deviceType)) {
                          actions.push({ type: deviceType, icon: IconComponent, label });
                        }
                      });
                    }

                    // Limit to first 3 actions for display
                    const displayActions = actions.slice(0, 3);

                    if (displayActions.length === 0) {
                      return (
                        <View style={styles.controlItem}>
                          <Text style={styles.controlText}>No actions configured</Text>
                        </View>
                      );
                    }

                    return displayActions.map((action, index) => (
                      <View key={index} style={styles.controlItem}>
                        {React.createElement(action.icon, { size: 16, color: "white" })}
                        <Text style={styles.controlText}>{action.label}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </LinearGradient>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
            style={styles.statCard}
          >
            <View style={styles.statIcon}>
              <Target size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{scenes.length}</Text>
            <Text style={styles.statLabel}>Total Scenes</Text>
          </LinearGradient>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
            style={styles.statCard}
          >
            <View style={styles.statIcon}>
              <CheckCircle size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{activeScenes.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </LinearGradient>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
            style={styles.statCard}
          >
            <View style={styles.statIcon}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{scenes.filter(s => s.schedule).length}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </LinearGradient>
        </View>

        {/* Popular Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Scenes</Text>
          <View style={styles.scenesGrid}>
            {inactiveScenes.slice(0, 6).map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={styles.sceneCardWrapper}
                onPress={() => toggleScene(scene.id)}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                  style={styles.sceneCard}
                >
                  <View style={styles.sceneCardHeader}>
                    <View style={styles.sceneCardIcon}>
                      {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 24, color: '#4D7BFE' })}
                    </View>
                    <Play size={16} color={colors.mutedForeground} />
                  </View>
                  <Text style={styles.sceneCardName}>{scene.name}</Text>
                  <View style={styles.sceneCardDetails}>
                    <Text style={styles.sceneCardDevices}>{(() => {
                      // Count devices from deviceTypeRules (new format) or deviceStates (old format)
                      if (scene.deviceTypeRules || scene.device_type_rules) {
                        const rules = scene.deviceTypeRules || scene.device_type_rules || [];
                        let totalDevices = 0;

                        rules.forEach((rule: any) => {
                          if (rule.mode === 'specific' && rule.deviceIds) {
                            totalDevices += rule.deviceIds.length;
                          } else if (rule.mode === 'all') {
                            // Count all devices of this type
                            const typeDevices = devices?.filter((d: any) => d.type === rule.type) || [];
                            totalDevices += typeDevices.length;
                          }
                        });

                        if (totalDevices === 0) return 'No devices';
                        return `${totalDevices} ${totalDevices === 1 ? 'device' : 'devices'}`;
                      }

                      // Fallback to old format
                      const deviceIds = Object.keys(scene.device_states || scene.deviceStates || {});
                      const count = deviceIds.length;
                      if (count === 0) return 'No devices';
                      if (count === 1) {
                        const device = devices?.find(d => d.id === deviceIds[0]);
                        return device?.name || '1 device';
                      }
                      return `${count} devices`;
                    })()}</Text>
                    {scene.time && (
                      <>
                        <Text style={styles.sceneCardSeparator}> • </Text>
                        <Clock size={12} color={colors.mutedForeground} />
                        <Text style={styles.sceneCardTime}> {scene.time}</Text>
                      </>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* All Scenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Scenes</Text>
          <View style={styles.allScenesList}>
            {inactiveScenes.map((scene) => (
              <TouchableOpacity
                key={scene.id}
                style={styles.sceneListItemWrapper}
                onPress={() => toggleScene(scene.id)}
                onLongPress={() => handleDeleteScene(scene.id)}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                  style={styles.sceneListItem}
                >
                  <View style={styles.sceneListIcon}>
                    {React.createElement(sceneIconMap[scene.icon] || Lightbulb, { size: 20, color: '#4D7BFE' })}
                  </View>
                  <View style={styles.sceneListContent}>
                    <Text style={styles.sceneListName}>{scene.name}</Text>
                    <Text style={styles.sceneListDescription}>
                      {(() => {
                        // Count devices from deviceTypeRules (new format) or deviceStates (old format)
                        if (scene.deviceTypeRules || scene.device_type_rules) {
                          const rules = scene.deviceTypeRules || scene.device_type_rules || [];
                          let totalDevices = 0;

                          rules.forEach((rule: any) => {
                            if (rule.mode === 'specific' && rule.deviceIds) {
                              totalDevices += rule.deviceIds.length;
                            } else if (rule.mode === 'all') {
                              const typeDevices = devices?.filter((d: any) => d.type === rule.type) || [];
                              totalDevices += typeDevices.length;
                            }
                          });

                          if (totalDevices === 0) return 'No devices configured';
                          return `${totalDevices} ${totalDevices === 1 ? 'device' : 'devices'}`;
                        }

                        // Fallback to old format
                        const deviceIds = Object.keys(scene.device_states || scene.deviceStates || {});
                        const count = deviceIds.length;
                        if (count === 0) return 'No devices configured';
                        if (count === 1) {
                          const device = devices?.find(d => d.id === deviceIds[0]);
                          return device?.name || '1 device';
                        }
                        return `${count} devices`;
                      })()}
                    </Text>
                  </View>
                  {scene.time && (
                    <View style={styles.sceneListTime}>
                      <Clock size={12} color={colors.mutedForeground} />
                      <Text style={styles.sceneListTimeText}>{scene.time}</Text>
                    </View>
                  )}
                  <View style={styles.sceneListActions}>
                    <TouchableOpacity
                      style={styles.sceneEditButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditScene(scene.id);
                      }}
                    >
                      <Edit size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <Play size={16} color={colors.mutedForeground} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smart Automations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Smart Automations</Text>
              <Text style={styles.sectionDescription}>
                Automate lighting, security, and comfort flows to match your routine.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Automations')}>
              <Text style={styles.manageAllText}>Manage All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.automationsList}>
            {automationLoading ? (
              <View style={styles.automationLoadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Validating automations...</Text>
              </View>
            ) : (
              <>
                {featuredAutomation ? (
                  <LinearGradient
                    colors={gradients.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredAutomationCard}
                  >
                    <View style={styles.automationHeader}>
                      <View style={styles.automationInfo}>
                        <View style={styles.featuredAutomationIcon}>
                          <Clock size={18} color="white" />
                        </View>
                        <View>
                          <Text style={styles.featuredAutomationName}>{featuredAutomation.name}</Text>
                          <Text style={styles.featuredAutomationTime}>{formatTriggerLabel(featuredAutomation)}</Text>
                        </View>
                      </View>
                      <View style={styles.automationControls}>
                        <View style={[styles.automationBadge, featuredAutomation.isActive ? styles.automationBadgeActive : styles.automationBadgePaused]}>
                          <Text style={styles.automationBadgeText}>{featuredAutomation.isActive ? 'Active' : 'Paused'}</Text>
                        </View>
                        <Switch
                          value={!!featuredAutomation.isActive}
                          onValueChange={() => handleToggleAutomation(featuredAutomation)}
                          disabled={automationLoading}
                          trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.6)' }}
                          thumbColor="white"
                        />
                      </View>
                    </View>
                    <View style={styles.featuredAutomationStats}>
                      <View style={styles.featuredAutomationStat}>
                        <Lightbulb size={14} color="white" />
                        <Text style={styles.featuredAutomationStatText}>{describeList(featuredAutomation.actions, 'action', 'actions')}</Text>
                      </View>
                      <View style={styles.featuredAutomationStat}>
                        <Fan size={14} color="white" />
                        <Text style={styles.featuredAutomationStatText}>{describeList(featuredAutomation.devices, 'device', 'devices')}</Text>
                      </View>
                      <View style={styles.featuredAutomationStat}>
                        <Shield size={14} color="white" />
                        <Text style={styles.featuredAutomationStatText}>{describeList(featuredAutomation.conditions, 'condition', 'conditions')}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.automationEmptyState}>
                    <Text style={styles.automationEmptyTitle}>No automations yet</Text>
                    <Text style={styles.automationEmptySubtitle}>Create your first automation to see it here.</Text>
                  </View>
                )}

                {otherAutomations.length > 0 && (
                  <View style={styles.automationGrid}>
                    {otherAutomations.slice(0, 3).map((automation) => (
                      <LinearGradient
                        key={automation.id}
                        colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)']}
                        style={styles.automationMiniCard}
                      >
                        <View style={styles.automationMiniHeader}>
                          <Text style={styles.automationMiniName}>{automation.name}</Text>
                          <View style={[styles.automationStatusDot, automation.isActive ? styles.automationStatusActive : styles.automationStatusPaused]} />
                        </View>
                        <Text style={styles.automationMiniTrigger}>{formatTriggerLabel(automation)}</Text>
                        <View style={styles.automationChipsRow}>
                          <View style={styles.automationChip}>
                            <Text style={styles.automationChipText}>{describeList(automation.actions, 'action', 'actions')}</Text>
                          </View>
                          <View style={styles.automationChip}>
                            <Text style={styles.automationChipText}>{describeList(automation.devices, 'device', 'devices')}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.automationMiniButton}
                          onPress={() => handleToggleAutomation(automation)}
                          disabled={automationLoading}
                        >
                          <Text style={styles.automationMiniButtonText}>
                            {automation.isActive ? 'Pause' : 'Resume'}
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                    ))}
                  </View>
                )}

                {automationError && (
                  <Text style={styles.automationHelperText}>{automationError}</Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    subHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: {
      fontSize: fontSize.xxl,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      gap: spacing.xs,
      ...shadows.neonPrimary,
    },
    createButtonText: {
      fontSize: fontSize.md,
      color: 'white',
      fontWeight: '600',
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: 100,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    sectionTitleContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      lineHeight: fontSize.sm * 1.5,
    },
    manageAllText: {
      fontSize: fontSize.sm,
      color: colors.primary,
    },
    activeSceneCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      ...shadows.neonPrimary,
    },
    activeSceneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    activeSceneInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    activeSceneIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: 'rgba(255, 255, 255, 0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    activeSceneContent: {
      flex: 1,
    },
    activeSceneName: {
      fontSize: fontSize.xl,
      fontWeight: '600',
      color: 'white',
      marginBottom: 4,
    },
    activeSceneDetails: {
      fontSize: fontSize.md,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    editButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
    },
    activeSceneControls: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    controlItem: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
      gap: 4,
    },
    controlText: {
      fontSize: fontSize.sm,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      ...shadows.lg,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(77, 123, 254, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: fontSize.xxl,
      fontWeight: '600',
      color: colors.foreground,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    scenesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    sceneCardWrapper: {
      width: '47%',
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xs,
      ...shadows.md,
    },
    sceneCard: {
      width: '100%',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sceneCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sceneCardIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sceneCardName: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    sceneCardDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sceneCardDevices: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    sceneCardSeparator: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    sceneCardTime: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    allScenesList: {
      gap: spacing.sm,
    },
    sceneListItemWrapper: {
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    sceneListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sceneListIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sceneListContent: {
      flex: 1,
    },
    sceneListName: {
      fontSize: fontSize.md,
      color: colors.foreground,
      marginBottom: 2,
    },
    sceneListDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    sceneListTime: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      gap: 4,
    },
    sceneListTimeText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    sceneListActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sceneEditButton: {
      padding: spacing.xs,
    },
    automationsList: {
      gap: spacing.sm,
    },
    automationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    automationMiniCard: {
      flex: 1,
      minWidth: '46%',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      ...shadows.md,
    },
    automationMiniHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    automationMiniName: {
      fontSize: fontSize.md - 1,
      color: colors.foreground,
      fontWeight: '600',
    },
    automationStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    automationStatusActive: {
      backgroundColor: colors.success,
    },
    automationStatusPaused: {
      backgroundColor: colors.muted,
    },
    automationMiniTrigger: {
      fontSize: fontSize.xs + 1,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    automationChipsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    automationChip: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: borderRadius.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
    },
    automationChipText: {
      fontSize: fontSize.xs + 1,
      color: colors.foreground,
      textAlign: 'center',
    },
    automationMiniButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    automationMiniButtonText: {
      fontSize: fontSize.sm,
      color: colors.foreground,
      fontWeight: '600',
    },
    automationHelperText: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginTop: spacing.sm,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    loadingText: {
      color: colors.mutedForeground,
      fontSize: fontSize.sm,
    },
  });