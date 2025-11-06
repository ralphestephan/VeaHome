import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getApiClient, ScenesApi, HubApi, HomeApi } from '../services/api';
import { useHomeData } from '../hooks/useHomeData';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

export default function SceneFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { user, token } = useAuth();
  const { sceneId, homeId } = route.params || { homeId: user?.homeId || '' };
  const { devices } = useHomeData(homeId);

  const [loading, setLoading] = useState(false);
  const [sceneName, setSceneName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('lightbulb');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [deviceStates, setDeviceStates] = useState<Record<string, any>>({});

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
      const scene = (response.data || []).find((s: any) => s.id === sceneId);
      if (scene) {
        setSceneName(scene.name);
        setSelectedIcon(scene.icon);
        if (scene.deviceStates) {
          setDeviceStates(scene.deviceStates);
          const deviceIds = Object.keys(scene.deviceStates);
          setSelectedDevices(new Set(deviceIds));
        }
      }
    } catch (e) {
      console.error('Error loading scene:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
      const newStates = { ...deviceStates };
      delete newStates[deviceId];
      setDeviceStates(newStates);
    } else {
      newSelected.add(deviceId);
      const device = devices.find(d => d.id === deviceId);
      setDeviceStates({
        ...deviceStates,
        [deviceId]: {
          isActive: device?.isActive || false,
          value: device?.value || undefined,
        },
      });
    }
    setSelectedDevices(newSelected);
  };

  const updateDeviceState = (deviceId: string, field: string, value: any) => {
    setDeviceStates({
      ...deviceStates,
      [deviceId]: {
        ...deviceStates[deviceId],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!sceneName.trim()) {
      Alert.alert('Error', 'Please enter scene name');
      return;
    }
    if (selectedDevices.size === 0) {
      Alert.alert('Error', 'Please select at least one device');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: sceneName,
        icon: selectedIcon,
        deviceStates,
        devices: Array.from(selectedDevices),
      };

      if (sceneId) {
        await scenesApi.updateScene(homeId, sceneId, payload);
        Alert.alert('Success', 'Scene updated successfully');
      } else {
        await scenesApi.createScene(homeId, payload);
        Alert.alert('Success', 'Scene created successfully');
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save scene');
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

  if (loading && sceneId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title={sceneId ? 'Edit Scene' : 'Create Scene'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scene...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <Header 
          title={sceneId ? 'Edit Scene' : 'Create Scene'} 
          showBack 
        />
        {sceneId && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={20} color={colors.destructive || '#ef4444'} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Scene Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Scene Name</Text>
          <TextInput
            style={styles.input}
            value={sceneName}
            onChangeText={setSceneName}
            placeholder="e.g., Morning Routine"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {SCENE_ICONS.map(({ id, name, icon: Icon }) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.iconCard,
                  selectedIcon === id && styles.iconCardSelected,
                ]}
                onPress={() => setSelectedIcon(id)}
              >
                <Icon
                  size={24}
                  color={selectedIcon === id ? 'white' : colors.primary}
                />
                <Text
                  style={[
                    styles.iconName,
                    selectedIcon === id && styles.iconNameSelected,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Device Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Devices ({selectedDevices.size} selected)</Text>
          <View style={styles.devicesList}>
            {devices.map((device) => {
              const isSelected = selectedDevices.has(device.id);
              const deviceState = deviceStates[device.id] || {};

              return (
                <View key={device.id} style={styles.deviceItem}>
                  <TouchableOpacity
                    style={styles.deviceHeader}
                    onPress={() => toggleDevice(device.id)}
                  >
                    <View style={styles.deviceInfo}>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
                        {isSelected && (
                          <CheckCircle size={16} color="white" />
                        )}
                      </View>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceType}>{device.type}</Text>
                    </View>
                    <ChevronRight
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>

                  {isSelected && (
                    <View style={styles.deviceConfig}>
                      <View style={styles.configRow}>
                        <Text style={styles.configLabel}>State</Text>
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            deviceState.isActive && styles.toggleButtonActive,
                          ]}
                          onPress={() =>
                            updateDeviceState(device.id, 'isActive', !deviceState.isActive)
                          }
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              deviceState.isActive && styles.toggleTextActive,
                            ]}
                          >
                            {deviceState.isActive ? 'ON' : 'OFF'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {(device.type === 'light' || device.value !== undefined) && (
                        <View style={styles.configRow}>
                          <Text style={styles.configLabel}>Value</Text>
                          <TextInput
                            style={styles.valueInput}
                            value={deviceState.value?.toString() || ''}
                            onChangeText={(text) =>
                              updateDeviceState(device.id, 'value', Number(text))
                            }
                            placeholder={device.value?.toString() || '0'}
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

            {devices.length === 0 && (
              <Text style={styles.emptyText}>No devices available</Text>
            )}
          </View>
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
                {sceneId ? 'Update Scene' : 'Create Scene'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.foreground,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  iconCard: {
    width: '30%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconName: {
    fontSize: 10,
    color: colors.foreground,
    textAlign: 'center',
  },
  iconNameSelected: {
    color: 'white',
    fontWeight: '600',
  },
  devicesList: {
    gap: spacing.md,
  },
  deviceItem: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceName: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '600',
  },
  deviceType: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginLeft: spacing.xs,
  },
  deviceConfig: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  toggleButton: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: 'white',
  },
  valueInput: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    width: 80,
    textAlign: 'center',
    color: colors.foreground,
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 12,
    padding: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
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

