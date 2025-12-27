import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Thermometer, 
  Droplets, 
  Zap, 
  Lightbulb, 
  Monitor, 
  Fan, 
  Music, 
  Snowflake, 
  Flame, 
  TrendingDown, 
  Wind,
  ChevronRight,
  Play,
  Settings,
  Sparkles,
  Trash2,
  CheckCircle,
  UserX,
  Plus,
} from 'lucide-react-native';
import { 
  spacing, 
  borderRadius, 
  fontSize, 
  fontWeight,
  ThemeColors,
} from '../constants/theme';
import { roomsData } from '../constants/rooms';
import Header from '../components/Header';
import DeviceTile from '../components/DeviceTile';
import DeviceControlModal from '../components/DeviceControlModal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { useHomeData } from '../hooks/useHomeData';
import { useHubs } from '../hooks/useHubs';
import { getApiClient, HomeApi, HubApi, PublicAirguardApi, ScenesApi } from '../services/api';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { useTheme } from '../context/ThemeContext';
import { decodeAlertFlags } from '../components/AirguardAlertBanner';
import { 
  NeonCard, 
  SectionHeader, 
  SkeletonLoader, 
  StatusBadge,
  AnimatedPressable,
  Chip,
} from '../components/ui';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  route: RouteProp<RootStackParamList, 'RoomDetail'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomDetail'>;
};

export default function RoomDetailScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.95)).current;
  const { user, token } = useAuth();
  const demo = useDemo();
  const isDemoMode = token === 'DEMO_TOKEN';
  const homeId = user?.homeId;
  const { refresh: refreshHomeData } = useHomeData(homeId || '');
  const { hubs } = useHubs(homeId);
  const [room, setRoom] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetTemp, setTargetTemp] = useState(22);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoClimate, setAutoClimate] = useState(true);
  const { controlDevice, toggleDevice, setValue } = useDeviceControl();
  const { showToast } = useToast();
  const [activeSceneName, setActiveSceneName] = useState<string>('');
  const [scenes, setScenes] = useState<any[]>([]);
  const [scenePickerVisible, setScenePickerVisible] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);
  const hubApi = HubApi(client);
  const airguardApi = PublicAirguardApi(client);
  const scenesApi = ScenesApi(client);

  const handleDeleteRoom = () => {
    if (isDemoMode) return;
    if (!homeId) {
      showToast('Missing home', { type: 'error' });
      return;
    }

    Alert.alert(
      'Delete room?',
      'This will delete the room. Any devices assigned to it may become unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('delete_room');
              await homeApi.deleteRoom(homeId, String(roomId));
              showToast('Room deleted', { type: 'success' });
              navigation.goBack();
            } catch {
              showToast('Failed to delete room', { type: 'error' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const assignSceneToRoom = async (sceneId: string | null) => {
    if (isDemoMode) {
      setScenePickerVisible(false);
      return;
    }
    if (!homeId) return;

    try {
      console.log('[Assign Scene] Starting - sceneId:', sceneId);
      console.log('[Assign Scene] Available scenes:', scenes.map(s => ({ id: s.id, name: s.name })));
      
      // Update local state IMMEDIATELY before API call
      const selectedScene = scenes.find(s => s.id === sceneId);
      console.log('[Assign Scene] Selected scene:', selectedScene);
      setActiveSceneName(selectedScene?.name || '');
      setScenePickerVisible(false);
      
      // Try with null first, fallback to empty string if backend rejects null
      let payload: any = { scene: sceneId };
      console.log('[Assign Scene] Sending payload:', payload);
      
      try {
        const response = await homeApi.updateRoom(homeId, String(roomId), payload);
        console.log('[Assign Scene] API response:', response);
      } catch (validationError: any) {
        console.log('[Assign Scene] Validation error:', validationError?.response?.status, validationError?.message);
        // If null is rejected (400 error), try with empty string
        if (validationError?.response?.status === 400 && sceneId === null) {
          console.log('[Assign Scene] Backend rejected null, trying empty string');
          payload = { scene: '' };
          const retryResponse = await homeApi.updateRoom(homeId, String(roomId), payload);
          console.log('[Assign Scene] Retry response:', retryResponse);
        } else {
          throw validationError;
        }
      }
      
      showToast(sceneId ? `Scene assigned successfully` : 'Scene removed successfully', { type: 'success' });
      
      console.log('[Assign Scene] Reloading room data...');
      // Reload data from backend to ensure sync
      await loadRoomData();
      // Also refresh the global home data so popup shows updated scene
      await refreshHomeData();
      console.log('[Assign Scene] Reload complete. New activeSceneName:', activeSceneName);
    } catch (err: any) {
      console.error('[Assign Scene] Error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to assign scene';
      showToast(errorMsg, { type: 'error' });
      // Revert on error
      await loadRoomData();
    }
  };

  // Hero animation on mount
  useEffect(() => {
    if (!loading && room) {
      Animated.parallel([
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, room]);

  useEffect(() => {
    loadRoomData();
    if (homeId) loadScenes();
  }, [roomId, homeId]);

  const loadScenes = async () => {
    if (!homeId || isDemoMode) return;
    try {
      const scenesRes = await scenesApi.listScenes(homeId);
      const scenesData = (scenesRes?.data?.data?.scenes ?? scenesRes?.data?.scenes ?? scenesRes?.data?.data ?? scenesRes?.data) || [];
      setScenes(Array.isArray(scenesData) ? scenesData : []);
    } catch (err) {
      console.log('Error loading scenes:', err);
      setScenes([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoomData();
    setRefreshing(false);
  };

  const loadRoomData = async () => {
    // Demo mode - use demo context devices
    if (isDemoMode) {
      const demoRoom = demo.rooms.find((r) => r.id === roomId) || null;
      const roomDevices = demo.devices.filter((d) => d.roomId === roomId);
      setRoom(demoRoom);
      setDevices(roomDevices);
      if (demoRoom && typeof demoRoom.temperature === 'number') {
        setTargetTemp(demoRoom.temperature);
      }
      setLoading(false);
      return;
    }

    if (!homeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [roomsRes, devicesRes, hubsRes] = await Promise.all([
        homeApi.getRooms(homeId).catch(() => ({ data: [] })),
        hubApi.listDevices(homeId).catch(() => ({ data: [] })),
        hubApi.listHubs(homeId).catch(() => ({ data: [] })), // Fetch hubs separately
      ]);

      const roomsPayload =
        (roomsRes as any)?.data?.data?.rooms ?? (roomsRes as any)?.data?.rooms ?? (roomsRes as any)?.data ?? [];
      const roomsList = Array.isArray(roomsPayload) ? roomsPayload : [];
      const baseRoom = roomsList.find((r: any) => String(r.id) === String(roomId)) || roomsData[roomId];

      const devicesPayload =
        (devicesRes as any)?.data?.data?.devices ?? (devicesRes as any)?.data?.devices ?? (devicesRes as any)?.data ?? [];
      const devicesList = Array.isArray(devicesPayload) ? devicesPayload : [];

      const mapDevice = (raw: any) => {
        const signalMappings = raw?.signalMappings ?? raw?.signal_mappings;
        return {
          id: String(raw.id),
          name: raw.name,
          type: raw.type,
          category: raw.category,
          isActive: raw.isActive ?? raw.is_active ?? false,
          value: raw.value ?? undefined,
          unit: raw.unit ?? undefined,
          roomId: raw.roomId ?? raw.room_id,
          hubId: raw.hubId ?? raw.hub_id,
          signalMappings: signalMappings && typeof signalMappings === 'object' ? signalMappings : undefined,
          airQualityData: raw.airQualityData,
          alarmMuted: raw.alarmMuted,
        };
      };

      // Get hubs from API response (prefer API response over hook to ensure fresh data)
      const hubsPayload =
        (hubsRes as any)?.data?.data?.hubs ?? (hubsRes as any)?.data?.hubs ?? (hubsRes as any)?.data ?? [];
      const hubsList = Array.isArray(hubsPayload) ? hubsPayload : [];
      
      // Also use hubs from hook as fallback
      const allHubs = hubsList.length > 0 ? hubsList : (hubs || []);
      
      // Map hubs to device format and include them in the device list
      const hubDevices = allHubs
        .filter((h: any) => {
          const hubRoomId = h.roomId || h.room_id;
          const matches = String(hubRoomId) === String(roomId);
          console.log('[RoomDetailScreen] Checking hub:', { hubId: h.id, hubName: h.name, hubRoomId, roomId, matches });
          return matches;
        })
        .map((h: any) => {
          const roomIdValue = h.roomId || h.room_id || '';
          console.log('[RoomDetailScreen] Mapping hub to device:', { hubId: h.id, hubName: h.name, roomId: roomIdValue });
          return {
            id: String(h.id),
            name: h.name,
            type: h.hubType || h.hub_type || 'airguard',
            category: 'climate' as const,
            isActive: h.status === 'online',
            value: undefined,
            unit: undefined,
            roomId: roomIdValue,
            hubId: h.id,
            homeId: h.homeId || h.home_id,
            status: h.status || 'offline',
            hubType: h.hubType || h.hub_type,
            serialNumber: h.serialNumber || h.serial_number,
            metadata: h.metadata,
            airQualityData: h.airQualityData,
          };
        });
      
      console.log('[RoomDetailScreen] Hub devices for room:', hubDevices.length, hubDevices.map(d => ({ id: d.id, name: d.name, roomId: d.roomId })));

      const baseDevices = [
        ...devicesList
          .map(mapDevice)
          .filter((d: any) => String(d.roomId) === String(roomId)),
        ...hubDevices,
      ];

      const toNum = (v: any): number | undefined => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        }
        return undefined;
      };

      const enrichedDevices = await Promise.all(
        baseDevices.map(async (d: any) => {
          if (d.type !== 'airguard') return d;
          
          // Get smartMonitorId from various sources (hubs have it in metadata or serialNumber)
          let smartMonitorId: string | number | null = null;
          
          // For hubs, check metadata first
          if (d.metadata?.smartMonitorId) {
            smartMonitorId = d.metadata.smartMonitorId;
          }
          // Check signalMappings (for regular devices)
          else if ((d.signalMappings as any)?.smartMonitorId) {
            smartMonitorId = (d.signalMappings as any).smartMonitorId;
          }
          else if ((d.signalMappings as any)?.smartmonitorId) {
            smartMonitorId = (d.signalMappings as any).smartmonitorId;
          }
          // Try to extract from serialNumber for hubs (e.g., "SM_1" -> 1)
          else if (d.serialNumber && typeof d.serialNumber === 'string') {
            const match = d.serialNumber.match(/SM_(\d+)/i);
            if (match) {
              smartMonitorId = parseInt(match[1], 10);
            }
          }
          
          if (!smartMonitorId) {
            console.warn('[RoomDetailScreen] No smartMonitorId found for AirGuard device:', d.id, d.name);
            return d;
          }
          
          console.log('[RoomDetailScreen] Fetching AirGuard data for device:', d.name, 'smartMonitorId:', smartMonitorId);
          try {
            const [latestRes, statusRes] = await Promise.all([
              airguardApi.getLatest(smartMonitorId).catch(() => null),
              airguardApi.getStatus(smartMonitorId).catch(() => null),
            ]);

            const latest =
              (latestRes as any)?.data?.data?.data ??
              (latestRes as any)?.data?.data ??
              (latestRes as any)?.data;

            const status =
              (statusRes as any)?.data?.data?.data ??
              (statusRes as any)?.data?.data ??
              (statusRes as any)?.data;

            const isOnline = status?.online ?? false;

            if (!latest) return { ...d, isOnline, isActive: isOnline };

            const temperature = toNum(latest.temperature);
            const humidity = toNum(latest.humidity);
            const aqi = toNum(latest.aqi);
            const pm25 = toNum(latest.pm25 ?? latest.dust);
            const dust = toNum(latest.dust);
            const mq2 = toNum(latest.mq2);
            const alert = !!latest.alert;
            const alertFlags = toNum(latest.alertFlags) ?? 0;

            // Set airQualityData if we have ANY sensor data
            const hasAnyData = temperature !== undefined || humidity !== undefined || 
                               aqi !== undefined || dust !== undefined || mq2 !== undefined;

            return {
              ...d,
              isOnline,
              isActive: isOnline,
              airQualityData: hasAnyData
                ? {
                    temperature: temperature ?? 0,
                    humidity: humidity ?? 0,
                    aqi: aqi ?? dust ?? 0,
                    pm25: pm25 ?? dust,
                    dust,
                    mq2,
                    alert,
                    alertFlags,
                  }
                : d.airQualityData,
              alarmMuted: !latest.buzzerEnabled,
            };
          } catch {
            return { ...d, isOnline: false };
          }
        }),
      );

      const airguard = enrichedDevices.find((d: any) => d.type === 'airguard' && d.airQualityData);
      const nextRoom = {
        ...baseRoom,
        temperature: airguard?.airQualityData?.temperature ?? baseRoom?.temperature,
        humidity: airguard?.airQualityData?.humidity ?? baseRoom?.humidity,
        airQuality: airguard?.airQualityData?.aqi ?? baseRoom?.airQuality,
        pm25: airguard?.airQualityData?.pm25 ?? baseRoom?.pm25,
        mq2: airguard?.airQualityData?.mq2 ?? baseRoom?.mq2,
        alertFlags: airguard?.airQualityData?.alertFlags ?? (baseRoom as any)?.alertFlags ?? 0,
        alert: airguard?.airQualityData?.alert ?? baseRoom?.alert,
      };

      setRoom(nextRoom);
      setDevices(enrichedDevices);
      
      // Load active scene name - handle both UUID and corrupted object
      if (baseRoom?.scene) {
        try {
          let sceneIdToMatch = baseRoom.scene;
          let sceneNameFromObject = null;
          
          // Check if scene is a corrupted object
          if (typeof baseRoom.scene === 'object' && (baseRoom.scene as any).id) {
            console.log('[Room Scene] Corrupted scene object detected:', baseRoom.scene);
            sceneIdToMatch = (baseRoom.scene as any).id;
            // If object has name, extract it
            if ((baseRoom.scene as any).name) {
              sceneNameFromObject = (baseRoom.scene as any).name;
            }
          }
          
          const scenesRes = await scenesApi.listScenes(homeId);
          const scenesData = (scenesRes?.data?.data?.scenes ?? scenesRes?.data?.scenes ?? scenesRes?.data?.data ?? scenesRes?.data) || [];
          console.log('[Room Scene] Scene ID to match:', sceneIdToMatch);
          console.log('[Room Scene] Available scenes:', scenesData);
          const activeScene = Array.isArray(scenesData) ? scenesData.find((s: any) => String(s.id) === String(sceneIdToMatch)) : null;
          console.log('[Room Scene] Found scene:', activeScene);
          if (activeScene) {
            setActiveSceneName(activeScene.name);
          } else if (sceneNameFromObject) {
            // Fallback to name from corrupted object if scene not found in list
            setActiveSceneName(sceneNameFromObject);
          } else {
            setActiveSceneName('');
          }
        } catch (err) {
          console.log('Error loading scene name:', err);
          setActiveSceneName('');
        }
      } else {
        setActiveSceneName('');
      }
      
      const thermostat = enrichedDevices.find(
        (device: any) => device.type === 'thermostat' || device.type === 'ac'
      );
      if (thermostat) {
        if (typeof thermostat.value === 'number') {
          setTargetTemp(thermostat.value);
        }
        if (typeof thermostat.mode === 'string') {
          setAutoClimate(thermostat.mode === 'auto');
        }
      }
    } catch (e) {
      console.error('Error loading room:', e);
      // Fallback to mock data
      setRoom(roomsData[roomId]);
      const roomDevices = roomsData[roomId]?.devices;
      setDevices(Array.isArray(roomDevices) ? roomDevices : []);
      const fallbackTemp = roomsData[roomId]?.temperature;
      if (typeof fallbackTemp === 'number') {
        setTargetTemp(fallbackTemp);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const thermostat = devices.find(
      (device) => device.type === 'thermostat' || device.type === 'ac'
    );
    if (thermostat && typeof thermostat.value === 'number') {
      setTargetTemp(thermostat.value);
    }
    if (thermostat && typeof thermostat.mode === 'string') {
      setAutoClimate(thermostat.mode === 'auto');
    }
  }, [devices]);

  const handleDeviceToggle = async (device: any, options?: { skipReload?: boolean }) => {
    try {
      if (device?.type === 'airguard') {
        setSelectedDevice(device);
        setModalVisible(true);
        return;
      }
      if (isDemoMode) {
        // Use demo context for device control
        demo.toggleDevice(device.id);
        // Update local state immediately
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, isActive: !d.isActive } : d
        ));
        showToast(`${device.name} ${device.isActive ? 'turned off' : 'turned on'}`, { type: 'success' });
        return;
      }
      await toggleDevice(device.id, device.isActive);
      if (!options?.skipReload) {
        await loadRoomData();
      }
    } catch (e) {
      showToast('Unable to toggle the selected device.', { type: 'error' });
    }
  };

  const handleMuteToggle = (deviceId: string, muted: boolean) => {
    if (isDemoMode) {
      demo.setDeviceMuted(deviceId, muted);
      setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, alarmMuted: muted } : d)));
      return;
    }

    const device = devices.find((d) => d.id === deviceId) || selectedDevice;
    if (!device || device.type !== 'airguard') return;

    const smartMonitorId = (device.signalMappings as any)?.smartMonitorId ?? 1;
    airguardApi
      .setBuzzer(smartMonitorId, muted ? 'OFF' : 'ON')
      .then(() => {
        setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, alarmMuted: muted } : d)));
        setSelectedDevice((prev: any) => (prev && prev.id === deviceId ? { ...prev, alarmMuted: muted } : prev));
        // Don't reload - just update local state for smoother UX
      })
      .catch((e) => {
        console.error('Failed to set Airguard buzzer state:', e);
      });
  };

  const toggleDevicesByType = async (types: string[], actionKey: string) => {
    const targets = devices.filter((device) => types.includes(device.type));
    if (!targets.length) {
      showToast('No matching devices in this room yet.', { type: 'info' });
      return;
    }

    setActionLoading(actionKey);
    try {
      await Promise.all(
        targets.map((device) => handleDeviceToggle(device, { skipReload: true }))
      );
      await loadRoomData();
    } catch (e) {
      showToast('Unable to run that quick action. Please try again.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const adjustTargetTemperature = async (delta: number) => {
    const nextTemp = Math.max(16, Math.min(30, targetTemp + delta));
    setTargetTemp(nextTemp);

    if (!devices.length) return;
    const thermostat = devices.find(
      (device) => device.type === 'thermostat' || device.type === 'ac'
    );
    if (!thermostat) {
      showToast('Add a thermostat to control climate in this room.', { type: 'info' });
      return;
    }

    try {
      if (isDemoMode) {
        // Use demo context for value setting
        demo.setDeviceValue(thermostat.id, nextTemp);
        setDevices(prev => prev.map(d => 
          d.id === thermostat.id ? { ...d, value: nextTemp } : d
        ));
        return;
      }
      await setValue(thermostat.id, nextTemp, thermostat.unit);
    } catch (e) {
      showToast('Failed to update thermostat temperature.', { type: 'error' });
    }
  };

  const handleAutoClimateToggle = async () => {
    const thermostat = devices.find(
      (device) => device.type === 'thermostat' || device.type === 'ac'
    );

    if (!thermostat) {
      showToast('Add a thermostat to enable auto climate mode.', { type: 'info' });
      return;
    }

    const nextAuto = !autoClimate;
    setAutoClimate(nextAuto);
    try {
      await controlDevice(thermostat.id, { mode: nextAuto ? 'auto' : 'manual' });
    } catch (e) {
      setAutoClimate(!nextAuto);
      showToast('Failed to update thermostat mode.', { type: 'error' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Loading..." showBack />
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <SkeletonLoader width="100%" height={200} borderRadius={borderRadius.xxl} />
          <View style={{ height: spacing.lg }} />
          <View style={styles.statsRowSkeleton}>
            <SkeletonLoader width="30%" height={40} borderRadius={borderRadius.lg} />
            <SkeletonLoader width="30%" height={40} borderRadius={borderRadius.lg} />
            <SkeletonLoader width="30%" height={40} borderRadius={borderRadius.lg} />
          </View>
          <View style={{ height: spacing.lg }} />
          <SkeletonLoader width={120} height={16} borderRadius={borderRadius.md} />
          <View style={{ height: spacing.md }} />
          <View style={styles.devicesGridSkeleton}>
            <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.xl} />
            <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.xl} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Room not found" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>Room not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const thermostatDevice = devices.find(
    (device) => device.type === 'thermostat' || device.type === 'ac'
  );
  const hasLights = devices.some((device) => device.type === 'light');
  const hasUtility = devices.some((device) => device.type === 'tv' || device.type === 'speaker');
  const hasShutters = devices.some((device) => device.type === 'blind' || device.type === 'shutter');
  const lightsCount = devices.filter((device) => device.type === 'light').length;
  const utilityCount = devices.filter((device) => device.type === 'tv' || device.type === 'speaker').length;
  const shuttersCount = devices.filter((device) => device.type === 'blind' || device.type === 'shutter').length;
  const roomDeviceCount = Array.isArray(room.devices)
    ? room.devices.length
    : typeof room.devices === 'number'
    ? room.devices
    : devices.length;

  // Room online status: at least one device is online
  const onlineDevicesCount = devices.filter((d) => d.isOnline !== false).length;
  const isRoomOnline = devices.length === 0 || onlineDevicesCount > 0;

  // Alert detection from room data - prioritize alertFlags from device
  const alertFlags = (room as any).alertFlags ?? 0;
  let alertReasons: string[] = decodeAlertFlags(alertFlags);
  
  // Fallback to manual threshold detection if no alertFlags
  if (alertReasons.length === 0) {
    const PM25_BAD_THRESHOLD = 400;
    const MQ2_BAD_THRESHOLD = 60;
    const TEMP_HIGH_THRESHOLD = 35;
    const HUMIDITY_HIGH_THRESHOLD = 80;

    if (room.pm25 !== undefined && room.pm25 > PM25_BAD_THRESHOLD) alertReasons.push('Dust');
    if (room.mq2 !== undefined && room.mq2 > MQ2_BAD_THRESHOLD) alertReasons.push('Gas');
    if (typeof room.temperature === 'number' && room.temperature > TEMP_HIGH_THRESHOLD) alertReasons.push('Temp');
    if (typeof room.humidity === 'number' && room.humidity > HUMIDITY_HIGH_THRESHOLD) alertReasons.push('Humidity');
  }
  const hasRoomAlert = alertReasons.length > 0 || room.alert === true;

  // Air quality (dust/gas only) - use alertFlags or alertReasons
  const hasAirSensors = room.pm25 !== undefined || room.mq2 !== undefined;
  const isAirBad = alertReasons.includes('Dust') || alertReasons.includes('Gas');

  const handleClimatePress = () => {
    if (!thermostatDevice) {
      showToast('Add a thermostat to control climate from here.', { type: 'info' });
      return;
    }
    navigation.navigate('Thermostat', { roomId, deviceId: thermostatDevice.id });
  };

  const quickControls = [
    {
      key: 'lights',
      label: 'All Lights',
      icon: Lightbulb,
      meta: hasLights
        ? `${lightsCount || room.lights || 0} connected`
        : 'No lights connected',
      onPress: () => toggleDevicesByType(['light'], 'lights'),
      disabled: actionLoading === 'lights' || !hasLights,
    },
    {
      key: 'climate',
      label: 'Climate',
      icon: Thermometer,
      meta: thermostatDevice
        ? `Target ${targetTemp.toFixed(0)}°C`
        : 'Add a thermostat',
      onPress: handleClimatePress,
      disabled: !thermostatDevice,
    },
    {
      key: 'shutters',
      label: 'Shutters',
      icon: Fan,
      meta: hasShutters ? `${shuttersCount} shade${shuttersCount === 1 ? '' : 's'}` : 'No shutters yet',
      onPress: () => toggleDevicesByType(['blind', 'shutter'], 'shutters'),
      disabled: actionLoading === 'shutters' || !hasShutters,
    },
    {
      key: 'utility',
      label: 'Utility',
      icon: Music,
      meta: hasUtility ? `${utilityCount} media device${utilityCount === 1 ? '' : 's'}` : 'No media devices',
      onPress: () => toggleDevicesByType(['tv', 'speaker'], 'utility'),
      disabled: actionLoading === 'utility' || !hasUtility,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={room.name || 'Room'}
        showBack
        showSettings={false}
        rightContent={
          !isDemoMode ? (
            <TouchableOpacity
              onPress={handleDeleteRoom}
              accessibilityRole="button"
              accessibilityLabel="Delete room"
              disabled={actionLoading === 'delete_room'}
              activeOpacity={0.7}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
            >
              <Trash2
                size={20}
                color={colors.foreground}
                opacity={actionLoading === 'delete_room' ? 0.5 : 1}
              />
            </TouchableOpacity>
          ) : (
            undefined
          )
        }
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero Section */}
        <Animated.View style={{ 
          transform: [{ scale: heroScale }], 
          opacity: heroOpacity 
        }}>
          {room.image ? (
            <ImageBackground
              source={{ uri: room.image }}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            >
              <LinearGradient
                colors={['transparent', 'rgba(6, 8, 22, 0.95)']}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroBadges}>
                    <View style={styles.heroBadge}>
                      <Sparkles size={12} color={colors.neonCyan} />
                      <Text style={styles.heroBadgeText}>{activeSceneName || 'No Scene'}</Text>
                    </View>
                    {hasRoomAlert && (
                      <StatusBadge variant="warning" size="sm" label={`Alert: ${alertReasons.join(', ')}`} />
                    )}
                    <StatusBadge variant={isRoomOnline ? 'online' : 'offline'} size="sm" label={isRoomOnline ? 'Online' : 'Offline'} />
                  </View>
                  <Text style={styles.heroTitle}>{room.name}</Text>
                  <Text style={styles.heroSubtitle}>
                    {roomDeviceCount} devices • {room.power || '0W'}
                  </Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradientFallback}
            >
              <View style={styles.heroGlowOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroBadges}>
                  <View style={styles.heroBadge}>
                    <Sparkles size={12} color={colors.neonCyan} />
                    <Text style={styles.heroBadgeText}>{activeSceneName || 'No Scene'}</Text>
                  </View>
                  {hasRoomAlert && (
                    <StatusBadge variant="warning" size="sm" label={`Alert: ${alertReasons.join(', ')}`} />
                  )}
                  <StatusBadge variant={isRoomOnline ? 'online' : 'offline'} size="sm" label={isRoomOnline ? 'Online' : 'Offline'} />
                </View>
                <Text style={styles.heroTitle}>{room.name}</Text>
                <Text style={styles.heroSubtitle}>
                  {roomDeviceCount} devices • {room.power || '0W'}
                </Text>
              </View>
            </LinearGradient>
          )}
        </Animated.View>

        {/* Room Stats */}
        <View style={styles.statsRow}>
          <NeonCard style={[styles.statCard, alertReasons.includes('Temp') && { borderColor: colors.destructive }]}>
            <Thermometer size={18} color={alertReasons.includes('Temp') ? colors.destructive : colors.neonBlue} />
            <Text style={[styles.statValue, alertReasons.includes('Temp') && { color: colors.destructive }]}>
              {room.temperature}°C
            </Text>
            <Text style={styles.statLabel}>Temp</Text>
          </NeonCard>
          <NeonCard style={[styles.statCard, alertReasons.includes('Humidity') && { borderColor: colors.destructive }]}>
            <Droplets size={18} color={alertReasons.includes('Humidity') ? colors.destructive : colors.neonCyan} />
            <Text style={[styles.statValue, alertReasons.includes('Humidity') && { color: colors.destructive }]}>
              {room.humidity}%
            </Text>
            <Text style={styles.statLabel}>Humidity</Text>
          </NeonCard>
          {hasAirSensors ? (
            <NeonCard style={[styles.statCard, isAirBad && { borderColor: colors.destructive }]}>
              <Wind size={18} color={isAirBad ? colors.destructive : colors.success} />
              <Text style={[styles.statValue, isAirBad && { color: colors.destructive }]}>
                {isAirBad ? 'Bad' : 'Good'}
              </Text>
              <Text style={styles.statLabel}>Air</Text>
            </NeonCard>
          ) : (
            <NeonCard style={styles.statCard}>
              <Zap size={18} color={colors.warning} />
              <Text style={styles.statValue}>{room.power}</Text>
              <Text style={styles.statLabel}>Power</Text>
            </NeonCard>
          )}
        </View>

        {/* Alert Banner */}
        {hasRoomAlert && (
          <View style={styles.alertBanner}>
            <View style={styles.alertBannerContent}>
              <Wind size={16} color="#fff" />
              <Text style={styles.alertBannerText}>
                Alert: {alertReasons.length > 0 ? alertReasons.join(', ') : 'Sensor Alert'}
              </Text>
            </View>
          </View>
        )}

        {/* Scene Controls - Only show if scene is assigned */}
        {activeSceneName && (
          <View style={styles.section}>
            <SectionHeader 
              title="Active Scene" 
              action={{
                label: 'Scenes',
                onPress: () => navigation.navigate('Dashboard', { screen: 'Scenes' }),
              }}
            />
            <TouchableOpacity onPress={() => navigation.navigate('Dashboard', { screen: 'Scenes' })}>
              <NeonCard glow="primary" style={styles.sceneCard}>
                <View style={styles.sceneInfo}>
                  <View style={styles.sceneIcon}>
                    <Play size={20} color={colors.primary} />
                  </View>
                  <View style={styles.sceneText}>
                    <Text style={styles.sceneName}>{activeSceneName}</Text>
                    <Text style={styles.sceneDetail}>Tap to manage scenes</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.sceneButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setScenePickerVisible(true);
                  }}
                >
                  <Settings size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </NeonCard>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Scene Button - Only show if no scene assigned and not in demo mode */}
        {!activeSceneName && !isDemoMode && (
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setScenePickerVisible(true)}>
              <NeonCard style={styles.addSceneCard}>
                <Plus size={20} color={colors.primary} />
                <Text style={styles.addSceneText}>Assign Scene to Room</Text>
              </NeonCard>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Controls */}
        <View style={styles.section}>
          <SectionHeader title="Quick Controls" />
          <View style={styles.controlsGrid}>
            {quickControls.map((control) => (
              <AnimatedPressable
                key={control.key}
                onPress={control.onPress}
                disabled={control.disabled}
                style={[styles.controlCard, control.disabled && styles.controlCardDisabled]}
              >
                <LinearGradient
                  colors={gradients.card}
                  style={styles.controlCardGradient}
                >
                  <View style={[styles.controlIcon, { backgroundColor: colors.primary + '20' }]}>
                    <control.icon size={18} color={colors.primary} />
                  </View>
                  <View style={styles.controlCopy}>
                    <Text style={styles.controlLabel}>{control.label}</Text>
                    <Text style={styles.controlMeta}>{control.meta}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </LinearGradient>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Devices Section */}
        <View style={styles.section}>
          <SectionHeader 
            title="Devices" 
            action={{
              label: 'Manage',
              onPress: () => navigation.navigate('Dashboard', { screen: 'Devices' }),
            }}
          />
          <View style={styles.devicesGrid}>
            {devices.length > 0 ? (
              devices.map((device) => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTile
                    icon={device.type}
                    name={device.name}
                    value={device.value}
                    unit={device.unit}
                    isActive={device.isActive}
                    onPress={() => handleDeviceToggle(device)}
                  />
                </View>
              ))
            ) : (
              <NeonCard style={styles.emptyDevices}>
                <Text style={styles.emptyText}>No devices in this room</Text>
              </NeonCard>
            )}
          </View>
        </View>

        {/* Climate Control */}
        <View style={styles.section}>
          <SectionHeader title="Climate Control" />
          <NeonCard style={styles.climateCard}>
            <View style={styles.climateHeader}>
              <View style={styles.climateInfo}>
                <View style={styles.climateIconContainer}>
                  <Thermometer size={20} color={colors.neonBlue} />
                </View>
                <Text style={styles.climateLabel}>Temperature</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.autoButton,
                  autoClimate && styles.autoButtonActive,
                  !thermostatDevice && styles.controlCardDisabled
                ]}
                onPress={handleAutoClimateToggle}
                disabled={!thermostatDevice}
              >
                <Text style={[styles.autoButtonText, autoClimate && styles.autoButtonTextActive]}>
                  {autoClimate ? 'Auto On' : 'Manual'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.climateControls}>
              <TouchableOpacity 
                style={styles.climateButton}
                onPress={() => adjustTargetTemperature(-1)}
              >
                <Snowflake size={22} color={colors.neonBlue} />
              </TouchableOpacity>
              <View style={styles.climateValue}>
                <Text style={styles.climateTemp}>{room.temperature}°C</Text>
                <Text style={styles.climateTarget}>
                  Target: {targetTemp}°C
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.climateButton}
                onPress={() => adjustTargetTemperature(1)}
              >
                <Flame size={22} color={colors.destructive} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.climateStats}>
              <View style={styles.climateStat}>
                <Droplets size={16} color={colors.neonCyan} />
                <Text style={styles.climateStatLabel}>Humidity</Text>
                <Text style={styles.climateStatValue}>{room.humidity}%</Text>
              </View>
              <View style={styles.climateStat}>
                <Wind size={16} color={colors.success} />
                <Text style={styles.climateStatLabel}>Air Quality</Text>
                <Text style={styles.climateStatValue}>Good</Text>
              </View>
            </View>
          </NeonCard>
        </View>

        {/* Energy Usage - Hidden until we implement real power monitoring */}
        {false && (
        <View style={styles.section}>
          <SectionHeader title="Energy Usage" />
          <NeonCard style={styles.energyCard}>
            <View style={styles.energyHeader}>
              <View>
                <Text style={styles.energyLabel}>Current Power</Text>
                <Text style={styles.energyValue}>{room.power || '0W'}</Text>
              </View>
            </View>
            <Text style={styles.energyNote}>Real-time power monitoring coming soon</Text>
          </NeonCard>
        </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Scene Picker Modal */}
      <Modal
        visible={scenePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setScenePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Scene to Room</Text>
              <TouchableOpacity onPress={() => setScenePickerVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sceneList}>
              {/* Remove Scene Option */}
              <TouchableOpacity
                style={[styles.sceneOption, !activeSceneName && styles.sceneOptionActive]}
                onPress={() => assignSceneToRoom(null)}
              >
                <View style={styles.sceneOptionIcon}>
                  <UserX size={20} color={colors.mutedForeground} />
                </View>
                <Text style={styles.sceneOptionText}>No Scene</Text>
                {!activeSceneName && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Available Scenes */}
              {scenes.map((scene) => (
                <TouchableOpacity
                  key={scene.id}
                  style={[styles.sceneOption, activeSceneName === scene.name && styles.sceneOptionActive]}
                  onPress={() => assignSceneToRoom(scene.id)}
                >
                  <View style={styles.sceneOptionIcon}>
                    <Play size={20} color={colors.primary} />
                  </View>
                  <View style={styles.sceneOptionInfo}>
                    <Text style={styles.sceneOptionText}>{scene.name}</Text>
                    <Text style={styles.sceneOptionSubtext}>
                      {Object.keys(scene.device_states || scene.deviceStates || {}).length} devices
                    </Text>
                  </View>
                  {activeSceneName === scene.name && (
                    <CheckCircle size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {selectedDevice && (
        <DeviceControlModal
          visible={modalVisible}
          device={selectedDevice}
          onClose={() => {
            setModalVisible(false);
            setSelectedDevice(null);
          }}
          onToggle={(deviceId) => {
            const d = devices.find((x) => x.id === deviceId) || selectedDevice;
            if (!d || d.type === 'airguard') return;
            handleDeviceToggle(d);
          }}
          onSetValue={(deviceId, value) => {
            const d = devices.find((x) => x.id === deviceId) || selectedDevice;
            if (!d) return;
            if (isDemoMode) {
              demo.setDeviceValue(deviceId, value);
              return;
            }
            setValue(deviceId, value, d.unit);
            loadRoomData();
          }}
          onToggleMute={handleMuteToggle}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statsRowSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  devicesGridSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  // Hero Section
  heroImage: {
    height: 220,
    width: '100%',
    marginBottom: spacing.lg,
  },
  heroImageStyle: {
    borderRadius: borderRadius.xxl,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: borderRadius.xxl,
  },
  heroGradientFallback: {
    height: 180,
    borderRadius: borderRadius.xxl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.glow,
  },
  heroGlowOverlay: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.neonCyan,
    opacity: 0.1,
  },
  heroContent: {
    padding: spacing.lg,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.lg,
  },
  heroBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.neonCyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },

  // Alert Banner
  alertBanner: {
    backgroundColor: colors.destructive,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  alertBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  alertBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  
  // Scene Section
  sceneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  sceneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  sceneIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneText: {
    flex: 1,
  },
  sceneName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  sceneDetail: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sceneButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSceneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addSceneText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  
  // Section
  section: {
    marginBottom: spacing.xl,
  },
  
  // Controls Grid
  controlsGrid: {
    gap: spacing.sm,
  },
  controlCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  controlCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlCardDisabled: {
    opacity: 0.5,
  },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlCopy: {
    flex: 1,
  },
  controlLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  controlMeta: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  
  // Devices Grid
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  deviceTileWrapper: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2,
  },
  emptyDevices: {
    width: '100%',
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  
  // Climate Card
  climateCard: {
    padding: spacing.lg,
  },
  climateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  climateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  climateIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neonBlue + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  climateLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  autoButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
  },
  autoButtonActive: {
    backgroundColor: colors.primary,
  },
  autoButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
  },
  autoButtonTextActive: {
    color: '#FFFFFF',
  },
  climateControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  climateButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  climateValue: {
    alignItems: 'center',
  },
  climateTemp: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  climateTarget: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  climateStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  climateStat: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  climateStatLabel: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  climateStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  
  // Energy Card
  energyCard: {
    padding: spacing.lg,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  energyLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  energyValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  energyBreakdown: {
    gap: spacing.md,
  },
  energyItem: {
    gap: spacing.xs,
  },
  energyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyItemLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  energyItemPercent: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  energyBarContainer: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  energyBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  
  errorText: {
    fontSize: fontSize.md,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  
  // Scene Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  modalClose: {
    fontSize: fontSize.xxl,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
  sceneList: {
    padding: spacing.lg,
  },
  sceneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  sceneOptionActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sceneOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneOptionInfo: {
    flex: 1,
  },
  sceneOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  sceneOptionSubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});