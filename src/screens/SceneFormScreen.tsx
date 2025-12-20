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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  X, 
  Save, 
  Trash2,
  Lightbulb,
  Sun,
  Moon,
  Film,
  PartyPopper,
  UserX,
  BedDouble,
  Briefcase,
  UtensilsCrossed,
  CheckCircle,
  ChevronRight,
  Home,
  Globe,
  Check,
  ChevronDown,
  Thermometer,
  Zap,
  Wind,
  Fan,
  Lock,
  Camera,
  Tv,
  Speaker,
  ShieldCheck,
} from 'lucide-react-native';
import { spacing, borderRadius, fontSize, ThemeColors, gradients as defaultGradients, shadows as defaultShadows } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import CreationHero from '../components/CreationHero';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, ScenesApi } from '../services/api';
import { useHomeData } from '../hooks/useHomeData';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Device } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    sceneId?: string;
    homeId: string;
  };
};

const SCENE_ICONS = [
  { id: 'weather-sunset-up', name: 'Sunrise', icon: Sun },
  { id: 'weather-night', name: 'Night', icon: Moon },
  { id: 'movie', name: 'Movie', icon: Film },
  { id: 'party-popper', name: 'Party', icon: PartyPopper },
  { id: 'account-off', name: 'Away', icon: UserX },
  { id: 'bed', name: 'Sleep', icon: BedDouble },
  { id: 'briefcase', name: 'Work', icon: Briefcase },
  { id: 'silverware-fork-knife', name: 'Dinner', icon: UtensilsCrossed },
  { id: 'lightbulb', name: 'Lights', icon: Lightbulb },
];

const DEVICE_TYPE_ICONS: Record<string, any> = {
  light: Lightbulb,
  ac: Thermometer,
  thermostat: Thermometer,
  airguard: Wind,
  fan: Fan,
  lock: Lock,
  camera: Camera,
  tv: Tv,
  speaker: Speaker,
  sensor: Zap,
  blind: ShieldCheck,
  shutter: ShieldCheck,
};

type SceneScope = 'home' | 'rooms';
type DeviceTypeRule = {
  type: string;
  mode: 'all' | 'specific'; // all devices of this type, or specific devices
  deviceIds?: string[]; // only when mode is 'specific'
  state: {
    isActive?: boolean;
    value?: any;
    buzzer?: boolean; // for airguard
  };
};

export default function SceneFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token } = useAuth();
  const { sceneId, homeId } = route.params || { homeId: user?.homeId || '' };
  const { devices, rooms } = useHomeData(homeId);

  const [loading, setLoading] = useState(false);
  const [sceneName, setSceneName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('lightbulb');
  const [scope, setScope] = useState<SceneScope>('home');
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [deviceTypeRules, setDeviceTypeRules] = useState<DeviceTypeRule[]>([]);
  
  // Modal states
  const [roomPickerVisible, setRoomPickerVisible] = useState(false);
  const [deviceTypePickerVisible, setDeviceTypePickerVisible] = useState(false);
  const [devicePickerVisible, setDevicePickerVisible] = useState(false);
  const [currentDeviceType, setCurrentDeviceType] = useState<string | null>(null);

  const client = getApiClient(async () => token);
  const scenesApi = ScenesApi(client);

  useEffect(() => {
    if (sceneId && homeId) {
      loadScene();
    }
  }, [sceneId, homeId]);

  const loadScene = async () => {
    try {
      setLoading(true);
      const response = await scenesApi.listScenes(homeId);
      const raw = (response as any)?.data;
      const payload = raw?.data?.scenes ?? raw?.scenes ?? raw?.data ?? raw;
      const scenesList = Array.isArray(payload) ? payload : [];
      const scene = scenesList.find((s: any) => s.id === sceneId);
      if (scene) {
        setSceneName(scene.name);
        setSelectedIcon(scene.icon || 'lightbulb');
        
        // Parse new structure
        if (scene.scope) {
          setScope(scene.scope);
        }
        if (scene.roomIds && Array.isArray(scene.roomIds)) {
          setSelectedRoomIds(new Set(scene.roomIds));
        }
        if (scene.deviceTypeRules && Array.isArray(scene.deviceTypeRules)) {
          setDeviceTypeRules(scene.deviceTypeRules);
        }
      }
    } catch (e) {
      console.error('Error loading scene:', e);
    } finally {
      setLoading(false);
    }
  };

  const availableDeviceTypes = useMemo(() => {
    const types = new Set<string>();
    devices.forEach(d => types.add(d.type));
    return Array.from(types).sort();
  }, [devices]);

  const addDeviceType = (type: string) => {
    if (deviceTypeRules.find(r => r.type === type)) {
      Alert.alert('Already Added', `${type} is already in this scene`);
      return;
    }
    
    setDeviceTypeRules([
      ...deviceTypeRules,
      {
        type,
        mode: 'all',
        state: {
          isActive: type === 'airguard' ? undefined : false,
          buzzer: type === 'airguard' ? true : undefined,
        },
      },
    ]);
    setDeviceTypePickerVisible(false);
  };

  const removeDeviceType = (type: string) => {
    setDeviceTypeRules(deviceTypeRules.filter(r => r.type !== type));
  };

  const updateDeviceTypeRule = (type: string, updates: Partial<DeviceTypeRule>) => {
    setDeviceTypeRules(deviceTypeRules.map(r => 
      r.type === type ? { ...r, ...updates } : r
    ));
  };

  const toggleRoomSelection = (roomId: string) => {
    const newSet = new Set(selectedRoomIds);
    if (newSet.has(roomId)) {
      newSet.delete(roomId);
    } else {
      newSet.add(roomId);
    }
    setSelectedRoomIds(newSet);
  };

  const openDevicePicker = (type: string) => {
    setCurrentDeviceType(type);
    setDevicePickerVisible(true);
  };

  const toggleDeviceInRule = (deviceId: string) => {
    if (!currentDeviceType) return;
    
    const rule = deviceTypeRules.find(r => r.type === currentDeviceType);
    if (!rule) return;

    const currentIds = new Set(rule.deviceIds || []);
    if (currentIds.has(deviceId)) {
      currentIds.delete(deviceId);
    } else {
      currentIds.add(deviceId);
    }

    updateDeviceTypeRule(currentDeviceType, {
      deviceIds: Array.from(currentIds),
    });
  };

  const handleSave = async () => {
    if (!sceneName.trim()) {
      Alert.alert('Error', 'Please enter scene name');
      return;
    }
    
    if (scope === 'rooms' && selectedRoomIds.size === 0) {
      Alert.alert('Error', 'Please select at least one room for room-level scene');
      return;
    }
    
    if (deviceTypeRules.length === 0) {
      Alert.alert('Error', 'Please add at least one device type');
      return;
    }

    // Validate specific device selections
    for (const rule of deviceTypeRules) {
      if (rule.mode === 'specific' && (!rule.deviceIds || rule.deviceIds.length === 0)) {
        Alert.alert('Error', `Please select specific devices for ${rule.type} or change to "All devices"`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: sceneName,
        icon: selectedIcon,
        scope,
        roomIds: scope === 'rooms' ? Array.from(selectedRoomIds) : [],
        deviceTypeRules,
      };

      console.log('[SceneForm] Saving scene:', JSON.stringify(payload, null, 2));

      if (sceneId) {
        const response = await scenesApi.updateScene(homeId, sceneId, payload);
        console.log('[SceneForm] Update response:', response);
        Alert.alert('Success', 'Scene updated successfully');
      } else {
        const response = await scenesApi.createScene(homeId, payload);
        console.log('[SceneForm] Create response:', response);
        Alert.alert('Success', 'Scene created successfully');
      }
      navigation.goBack();
    } catch (e: any) {
      console.error('Save scene error:', e);
      console.error('Error response:', e?.response?.data);
      console.error('Error details:', JSON.stringify(e?.response, null, 2));
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to save scene';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sceneId) return;

    Alert.alert(
      'Delete Scene',
      'Are you sure you want to delete this scene?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await scenesApi.deleteScene(homeId, sceneId);
              Alert.alert('Success', 'Scene deleted successfully');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to delete scene');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredDevicesForType = useMemo(() => {
    if (!currentDeviceType) return [];
    
    let filtered = devices.filter(d => d.type === currentDeviceType);
    
    // If room-level scene, only show devices in selected rooms
    if (scope === 'rooms' && selectedRoomIds.size > 0) {
      filtered = filtered.filter(d => d.roomId && selectedRoomIds.has(String(d.roomId)));
    }
    
    return filtered;
  }, [devices, currentDeviceType, scope, selectedRoomIds]);

  if (loading && sceneId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title={sceneId ? 'Edit Scene' : 'Create Scene'}
          showBack
          showSettings={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scene...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ruleCount = deviceTypeRules.length;
  const heroMeta = scope === 'home' 
    ? `Home-wide • ${ruleCount} device type${ruleCount === 1 ? '' : 's'}`
    : `${selectedRoomIds.size} room${selectedRoomIds.size === 1 ? '' : 's'} • ${ruleCount} device type${ruleCount === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={sceneId ? 'Edit Scene' : 'Create Scene'}
        showBack
        showSettings={false}
        rightContent={sceneId ? (
          <TouchableOpacity onPress={handleDelete}>
            <Trash2 size={24} color={colors.destructive} />
          </TouchableOpacity>
        ) : undefined}
      />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CreationHero
          eyebrow={sceneId ? 'Scene details' : 'New scene'}
          title={sceneId ? 'Edit Scene' : 'Create Scene'}
          description="Configure device states across your home or specific rooms with flexible device selection."
          meta={heroMeta}
        />

        {/* Scene Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scene Name</Text>
          <TextInput
            style={styles.input}
            value={sceneName}
            onChangeText={setSceneName}
            placeholder="e.g., Good Night, Movie Time"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Icon</Text>
          <View style={styles.iconGrid}>
            {SCENE_ICONS.map(({ id, name, icon: IconComponent }) => (
              <TouchableOpacity
                key={id}
                style={[styles.iconButton, selectedIcon === id && styles.iconButtonActive]}
                onPress={() => setSelectedIcon(id)}
              >
                <IconComponent size={24} color={selectedIcon === id ? '#fff' : colors.mutedForeground} />
                <Text style={[styles.iconButtonText, selectedIcon === id && styles.iconButtonTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scope Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scene Scope</Text>
          <View style={styles.scopeToggle}>
            <TouchableOpacity
              style={[styles.scopeButton, scope === 'home' && styles.scopeButtonActive]}
              onPress={() => setScope('home')}
            >
              <Globe size={20} color={scope === 'home' ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.scopeButtonText, scope === 'home' && styles.scopeButtonTextActive]}>
                Entire Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeButton, scope === 'rooms' && styles.scopeButtonActive]}
              onPress={() => setScope('rooms')}
            >
              <Home size={20} color={scope === 'rooms' ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.scopeButtonText, scope === 'rooms' && styles.scopeButtonTextActive]}>
                Specific Rooms
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Room Selection (only for room-level scenes) */}
        {scope === 'rooms' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Rooms</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setRoomPickerVisible(true)}
            >
              <Text style={[styles.pickerText, selectedRoomIds.size === 0 && styles.pickerPlaceholder]}>
                {selectedRoomIds.size === 0 
                  ? 'Choose rooms...' 
                  : `${selectedRoomIds.size} room${selectedRoomIds.size === 1 ? '' : 's'} selected`}
              </Text>
              <ChevronDown size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Device Type Rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Device Types</Text>
            <TouchableOpacity
              style={styles.addTypeButton}
              onPress={() => setDeviceTypePickerVisible(true)}
            >
              <Text style={styles.addTypeButtonText}>+ Add Type</Text>
            </TouchableOpacity>
          </View>

          {deviceTypeRules.map((rule) => {
            const Icon = DEVICE_TYPE_ICONS[rule.type] || Zap;
            const devicesOfType = devices.filter(d => d.type === rule.type);
            const selectedCount = rule.deviceIds?.length || devicesOfType.length;
            
            return (
              <View key={rule.type} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleHeaderLeft}>
                    <Icon size={20} color={colors.primary} />
                    <Text style={styles.ruleType}>{rule.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeDeviceType(rule.type)}>
                    <Trash2 size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                {/* Mode Toggle: All vs Specific */}
                <View style={styles.modeToggle}>
                  <TouchableOpacity
                    style={[styles.modeButton, rule.mode === 'all' && styles.modeButtonActive]}
                    onPress={() => updateDeviceTypeRule(rule.type, { mode: 'all', deviceIds: [] })}
                  >
                    <Text style={[styles.modeButtonText, rule.mode === 'all' && styles.modeButtonTextActive]}>
                      All Devices
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeButton, rule.mode === 'specific' && styles.modeButtonActive]}
                    onPress={() => updateDeviceTypeRule(rule.type, { mode: 'specific' })}
                  >
                    <Text style={[styles.modeButtonText, rule.mode === 'specific' && styles.modeButtonTextActive]}>
                      Specific
                    </Text>
                  </TouchableOpacity>
                </View>

                {rule.mode === 'specific' && (
                  <TouchableOpacity
                    style={styles.devicePickerButton}
                    onPress={() => openDevicePicker(rule.type)}
                  >
                    <Text style={styles.devicePickerButtonText}>
                      {selectedCount === 0 ? 'Select devices...' : `${selectedCount} device${selectedCount === 1 ? '' : 's'} selected`}
                    </Text>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}

                {/* State Configuration */}
                {rule.type === 'airguard' ? (
                  <View style={styles.stateConfig}>
                    <View style={styles.stateRow}>
                      <Text style={styles.stateLabel}>Buzzer</Text>
                      <Switch
                        value={rule.state.buzzer !== false}
                        onValueChange={(val) => updateDeviceTypeRule(rule.type, { 
                          state: { ...rule.state, buzzer: val } 
                        })}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.stateConfig}>
                    <View style={styles.stateRow}>
                      <Text style={styles.stateLabel}>Power</Text>
                      <Switch
                        value={rule.state.isActive !== false}
                        onValueChange={(val) => updateDeviceTypeRule(rule.type, { 
                          state: { ...rule.state, isActive: val } 
                        })}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                    {(rule.type === 'ac' || rule.type === 'thermostat') && (
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Temperature (°C)</Text>
                        <TextInput
                          style={styles.valueInput}
                          value={rule.state.value?.toString() || '22'}
                          onChangeText={(text) => updateDeviceTypeRule(rule.type, { 
                            state: { ...rule.state, value: parseFloat(text) || 22 } 
                          })}
                          keyboardType="numeric"
                          placeholderTextColor={colors.mutedForeground}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
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
                {sceneId ? 'Update Scene' : 'Create Scene'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Room Picker Modal */}
      <Modal
        visible={roomPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoomPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rooms</Text>
              <TouchableOpacity onPress={() => setRoomPickerVisible(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roomItem}
                  onPress={() => toggleRoomSelection(item.id)}
                >
                  <Text style={styles.roomName}>{item.name}</Text>
                  {selectedRoomIds.has(item.id) && (
                    <CheckCircle size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Device Type Picker Modal */}
      <Modal
        visible={deviceTypePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeviceTypePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Device Type</Text>
              <TouchableOpacity onPress={() => setDeviceTypePickerVisible(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableDeviceTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const Icon = DEVICE_TYPE_ICONS[item] || Zap;
                const alreadyAdded = deviceTypeRules.find(r => r.type === item);
                return (
                  <TouchableOpacity
                    style={[styles.typeItem, alreadyAdded && styles.typeItemDisabled]}
                    onPress={() => addDeviceType(item)}
                    disabled={!!alreadyAdded}
                  >
                    <Icon size={20} color={alreadyAdded ? colors.mutedForeground : colors.primary} />
                    <Text style={[styles.typeName, alreadyAdded && styles.typeNameDisabled]}>
                      {item}
                    </Text>
                    {alreadyAdded && <Check size={16} color={colors.mutedForeground} />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>

      {/* Device Picker Modal (for specific device selection) */}
      <Modal
        visible={devicePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDevicePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {currentDeviceType} Devices</Text>
              <TouchableOpacity onPress={() => setDevicePickerVisible(false)}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredDevicesForType}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const rule = deviceTypeRules.find(r => r.type === currentDeviceType);
                const isSelected = rule?.deviceIds?.includes(item.id);
                return (
                  <TouchableOpacity
                    style={styles.deviceItem}
                    onPress={() => toggleDeviceInRule(item.id)}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceRoom}>
                        {rooms.find(r => r.id === item.roomId)?.name || 'Unknown room'}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: typeof defaultGradients, shadows: typeof defaultShadows) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
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
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.foreground,
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    iconButton: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 70,
    },
    iconButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    iconButtonText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
    },
    iconButtonTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    scopeToggle: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    scopeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    scopeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    scopeButtonText: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
      fontWeight: '600',
    },
    scopeButtonTextActive: {
      color: '#fff',
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
    addTypeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
    },
    addTypeButtonText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: '#fff',
    },
    ruleCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ruleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    ruleHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    ruleType: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.foreground,
      textTransform: 'capitalize',
    },
    modeToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      padding: 2,
    },
    modeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
    },
    modeButtonText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.mutedForeground,
    },
    modeButtonTextActive: {
      color: '#fff',
    },
    devicePickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
    },
    devicePickerButtonText: {
      fontSize: fontSize.sm,
      color: colors.foreground,
    },
    stateConfig: {
      gap: spacing.md,
    },
    stateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    stateLabel: {
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    valueInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.md,
      color: colors.foreground,
      minWidth: 60,
      textAlign: 'center',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.lg,
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
    modalList: {
      padding: spacing.lg,
    },
    roomItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    roomName: {
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    typeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    typeItemDisabled: {
      opacity: 0.5,
    },
    typeName: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.foreground,
      textTransform: 'capitalize',
    },
    typeNameDisabled: {
      color: colors.mutedForeground,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
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
    deviceRoom: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
  });
