import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Zap, 
  Home as HomeIcon, 
  Lightbulb, 
  Lock, 
  Clock, 
  Moon,
  Sun,
  Shield,
  ChevronRight,
  Plus,
  Edit3,
  Save,
  Cpu,
} from 'lucide-react-native';
import { 
  spacing, 
  borderRadius, 
  fontSize, 
  fontWeight,
  ThemeColors,
} from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from '../types';
import InteractiveFloorPlan, { InteractiveFloorPlanHandle } from '../components/InteractiveFloorPlan';
import RoomCard from '../components/RoomCard';
import Model3DViewer from '../components/Model3DViewer';
import { useAuth } from '../context/AuthContext';
import { useHomeData } from '../hooks/useHomeData';
import { useHubs } from '../hooks/useHubs';
import { useEnergyData } from '../hooks/useEnergyData';
import { useRealtime } from '../hooks/useRealtime';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { useAirguardAlerts } from '../hooks/useAirguardAlerts';
import AirguardAlertBanner, { decodeAlertFlags } from '../components/AirguardAlertBanner';
import { useDemo } from '@/context/DemoContext';
import type { Room, Device, Home } from '../types';
import { getApiClient, HomeApi, PublicAirguardApi, SchedulesApi, ScenesApi } from '../services/api';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { 
  NeonCard, 
  SectionHeader, 
  SkeletonLoader, 
  StatusBadge,
  AnimatedPressable,
} from '../components/ui';
import HomeStatusBar from '../components/HomeStatusBar';
import EnergyCard from '../components/EnergyCard';
import QuickAction from '../components/QuickAction';
import DeviceTile from '../components/DeviceTile';
import DeviceControlModal from '../components/DeviceControlModal';
import RoomPopupCard from '../components/RoomPopupCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEW_MODE_ORDER = ['2d', '3d'] as const;

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'DashboardTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const viewContentFade = useRef(new Animated.Value(1)).current;
  const heroScale = useRef(new Animated.Value(0.95)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const { user, token } = useAuth();
  const { currentHomeId } = useAuth();
  const homeId = currentHomeId || user?.homeId;
  const { rooms: homeRooms, devices: homeDevices, loading, refresh, createRoom, isDemoMode } = useHomeData(homeId);
  const { hubs: fetchedHubs } = useHubs(homeId);
  const hubs = Array.isArray(fetchedHubs) ? fetchedHubs : [];
  
  // Track live online/offline status for AirGuard hubs
  const [hubStatuses, setHubStatuses] = useState<Record<string, boolean>>({});
  
  // Fetch live status for airguard hubs (like on devices page)
  useEffect(() => {
    const airguardHubs = hubs.filter(h => h.hubType === 'airguard');
    if (airguardHubs.length === 0) {
      setHubStatuses({});
      return;
    }

    const fetchStatuses = async () => {
      const client = getApiClient(async () => token);
      const airguardApi = PublicAirguardApi(client);
      
      const statusPromises = airguardHubs.map(async (hub) => {
        try {
          const smartMonitorId = hub.metadata?.smartMonitorId || 
                                 (hub.serialNumber?.match(/SM_(\d+)/i)?.[1] ? parseInt(hub.serialNumber.match(/SM_(\d+)/i)![1], 10) : null);
          if (!smartMonitorId) return { hubId: hub.id, isOnline: false };
          
          const statusRes = await airguardApi.getStatus(smartMonitorId);
          const statusWrapper = statusRes.data?.data;
          const status = statusWrapper?.data || statusWrapper;
          const isOnline = status?.online === true || status?.online === 1;
          return { hubId: hub.id, isOnline };
        } catch (error) {
          return { hubId: hub.id, isOnline: false };
        }
      });

      const results = await Promise.all(statusPromises);
      const newStatuses: Record<string, boolean> = {};
      results.forEach(({ hubId, isOnline }) => {
        newStatuses[hubId] = isOnline;
        console.log(`[Dashboard] Hub ${hubId} live status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      });
      console.log(`[Dashboard] Updated hubStatuses:`, newStatuses);
      setHubStatuses(newStatuses);
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [hubs, token]);
  
  // Aggregate alertFlags from hubs so we can show a global alert badge in the hero
  const mergedHubAlertFlags = hubs.reduce((acc, h) => {
    const airQualityData = h?.airQualityData as any;
    const flags = Number(airQualityData?.alertFlags ?? h?.metadata?.alertFlags ?? 0) || 0;
    return acc | flags;
  }, 0);
  
  // Decode alert flags to get status message
  const alertReasons = decodeAlertFlags(mergedHubAlertFlags);
  const hasAlerts = alertReasons.length > 0;
  const { devices: demoDevices, rooms: demoRooms, toggleDevice: demoToggleDevice, activateScene, addRoom: demoAddRoom, setDeviceMuted } = useDemo();
  
  // Use demo data if in demo mode
  const rooms: Room[] = isDemoMode ? demoRooms : homeRooms;
  const devices: Device[] = isDemoMode ? demoDevices : homeDevices;
  
  // Monitor AirGuard alerts and send notifications (only for real users)
  useAirguardAlerts(isDemoMode ? [] : devices);
  
  const { energyData } = useEnergyData(homeId, 'day');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [showRoomPopup, setShowRoomPopup] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [home, setHome] = useState<Home | null>(null);
  const [isFloorPlanEditing, setIsFloorPlanEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const canEditLayout = viewMode === '2d';
  const isEditSession = canEditLayout && isFloorPlanEditing;
  const floorPlanRef = useRef<InteractiveFloorPlanHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { controlDevice } = useDeviceControl();
  const [quickActionLoading, setQuickActionLoading] = useState<null | 'lights' | 'locks' | 'scene'>(null);
  const { showToast } = useToast();
  const [scenes, setScenes] = useState<any[]>([]);
  const [activeScene, setActiveScene] = useState<any | null>(null);
  
  // Device control modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  // Hero animation on mount
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    viewContentFade.setValue(0.4);
    Animated.timing(viewContentFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [viewMode, viewContentFade]);

  useEffect(() => {
    if (!canEditLayout && isFloorPlanEditing) {
      setIsFloorPlanEditing(false);
    }
  }, [canEditLayout, isFloorPlanEditing]);

  // Load home data for 3D model URL
  useEffect(() => {
    const loadHome = async () => {
      if (homeId && token) {
        try {
          const client = getApiClient(async () => token);
          const homeApi = HomeApi(client);
          const response = await homeApi.getHome(homeId);
          console.log('[DashboardScreen] Loaded home:', response.data);
          const loadedHome = response.data?.data?.home ?? response.data?.home ?? response.data?.data ?? null;
          setHome(loadedHome);
        } catch (e) {
          console.error('Error loading home:', e);
        }
      }
    };
    loadHome();
  }, [homeId, token]);

  // Refetch home data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadHome = async () => {
        if (homeId && token) {
          try {
            const client = getApiClient(async () => token);
            const homeApi = HomeApi(client);
            const response = await homeApi.getHome(homeId);
            const loadedHome = response.data?.data?.home ?? response.data?.home ?? response.data?.data ?? null;
            setHome(loadedHome);
          } catch (e) {
            console.error('Error loading home on focus:', e);
          }
        }
      };
      loadHome();
    }, [homeId, token])
  );

  // Load schedules
  useEffect(() => {
    const loadSchedules = async () => {
      if (homeId && token && !isDemoMode) {
        try {
          const client = getApiClient(async () => token);
          const schedulesApi = SchedulesApi(client);
          const response = await schedulesApi.listSchedules(homeId);
          const schedulesList = response.data?.schedules || [];
          // Get next 2 upcoming schedules
          setSchedules(schedulesList.filter((s: any) => s.enabled).slice(0, 2));
        } catch (e) {
          console.error('Error loading schedules:', e);
          setSchedules([]);
        }
      }
    };
    loadSchedules();
  }, [homeId, token, isDemoMode]);

  // Load scenes and find active scene
  const demo = useDemo();
  
  // Get time-based scene recommendation
  const getTimeBasedScene = useCallback((scenesArray: any[]) => {
    const hour = new Date().getHours();
    const sceneName = hour >= 5 && hour < 12 ? 'morning' : 
                     hour >= 12 && hour < 17 ? 'afternoon' :
                     hour >= 17 && hour < 21 ? 'evening' : 'night';
    
    // Find scene matching current time of day
    const timeScene = scenesArray.find((s: any) => {
      const name = (s.name || '').toLowerCase();
      return (hour >= 5 && hour < 12 && (name.includes('morning') || name.includes('breakfast'))) ||
             (hour >= 12 && hour < 17 && (name.includes('afternoon') || name.includes('lunch'))) ||
             (hour >= 17 && hour < 21 && (name.includes('evening') || name.includes('dinner'))) ||
             ((hour >= 21 || hour < 5) && (name.includes('night') || name.includes('sleep') || name.includes('bed')));
    });
    
    return timeScene || null;
  }, []);
  
  useEffect(() => {
    const loadScenes = async () => {
      if (isDemoMode) {
        // Demo mode - use demo scenes
        const demoScenes = demo.scenes || [];
        setScenes(demoScenes);
        setActiveScene(demoScenes.find((s: any) => s.isActive) || null);
        return;
      }
      
      if (!homeId || !token) return;
      try {
        const client = getApiClient(async () => token);
        const scenesApi = ScenesApi(client);
        const response = await scenesApi.listScenes(homeId);
        const scenesList = response.data?.scenes || response.data?.data?.scenes || response.data?.data || [];
        const scenesArray = Array.isArray(scenesList) ? scenesList : [];
        setScenes(scenesArray);
        
        // Find active scene (one with isActive: true or is_active: true, or assigned to a room)
        const active = scenesArray.find((s: any) => s.isActive === true || s.is_active === true) || 
                      (rooms.find((r: Room) => r.scene) ? 
                        scenesArray.find((s: any) => rooms.some((r: Room) => {
                          const roomSceneId = typeof r.scene === 'string' ? r.scene : (r.scene as any)?.id;
                          return String(roomSceneId) === String(s.id);
                        })) : null);
        
        // If no active scene, suggest time-based scene for quick actions
        const suggestedScene = active || getTimeBasedScene(scenesArray);
        setActiveScene(suggestedScene);
      } catch (e) {
        console.error('Error loading scenes:', e);
        setScenes([]);
        setActiveScene(null);
      }
    };
    loadScenes();
  }, [homeId, token, isDemoMode, rooms, demo, getTimeBasedScene]);

  // Real-time updates
  const { isConnected: isCloudConnected } = useRealtime({
    onDeviceUpdate: () => refresh(),
    onEnergyUpdate: () => {},
  });

  // Listen for navigation events to refresh when returning from RoomDetailScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[DashboardScreen] Screen focused via navigation, refreshing data...');
      if (homeId) {
        refresh().then(() => {
          console.log('[DashboardScreen] Refresh complete after navigation focus');
        });
      }
    });

    return unsubscribe;
  }, [navigation, homeId, refresh]);

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (homeId) {
          console.log('[DashboardScreen] useFocusEffect: Refreshing data...');
          // Don't await - let it run in background so it doesn't block UI
          refresh().then(() => {
            console.log('[DashboardScreen] useFocusEffect: Refresh complete');
          }).catch(err => {
            console.error('[DashboardScreen] useFocusEffect: Refresh failed:', err);
          });
        }
      };
      refreshData();
    }, [homeId, refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleRoomSelect = async (roomId: string) => {
    console.log('[DashboardScreen] handleRoomSelect called for roomId:', roomId);
    userSelectedRoomRef.current = roomId;
    setSelectedRoom(roomId);
    
    // Check if room data exists before showing popup
    const currentRoom = rooms.find((r: Room) => String(r.id) === String(roomId));
    console.log('[DashboardScreen] Current room data:', currentRoom ? { id: currentRoom.id, name: currentRoom.name, deviceCount: currentRoom.devices?.length } : 'NOT FOUND');
    
    // Show popup immediately if we have room data, otherwise refresh first
    if (currentRoom) {
      setShowRoomPopup(true);
      // Refresh in background to update with latest data
      refresh().then(() => {
        console.log('[DashboardScreen] Background refresh complete. Rooms count:', rooms.length);
      }).catch(err => {
        console.error('[DashboardScreen] Background refresh failed:', err);
      });
    } else {
      // No room data yet, refresh first then show popup
      console.log('[DashboardScreen] No room data found, refreshing first...');
      await refresh();
      await new Promise(resolve => setTimeout(resolve, 100));
      setShowRoomPopup(true);
    }
  };

  const handleRoomPopupClose = () => {
    setShowRoomPopup(false);
  };

  const handleRoomViewDetails = (roomId: string) => {
    setShowRoomPopup(false);
    navigation.navigate('RoomDetail', { roomId });
  };

  const handleEditRoomsPress = () => {
    if (!canEditLayout) return;
    const controls = floorPlanRef.current;
    if (!controls) return;
    if (isEditSession) {
      controls.saveLayout();
    } else {
      controls.enterEditMode();
    }
  };

  const handleAddRoomPress = () => {
    if (!canEditLayout) return;
    floorPlanRef.current?.openAddRoomModal();
  };

  const handleLayoutUpdate = async (layout: any) => {
    if (!homeId || !token) return;
    try {
      const client = getApiClient(async () => token);
      const homeApi = HomeApi(client);
      await homeApi.updateRoomLayout(homeId, layout);
      refresh();
    } catch (e) {
      console.error('Error updating layout:', e);
    }
  };

  const handleRoomCreated = async (room: Room) => {
    try {
      if (isDemoMode) {
        demoAddRoom(room);
        return room;
      }
      const created = await createRoom(room);
      showToast('Room created successfully!', { type: 'success' });
      return created;
    } catch (error: any) {
      console.error('Room creation error:', error);
      const message = error?.message || 'Failed to create room';
      showToast(message, { type: 'error' });
      throw error;
    }
  };

  const runBulkDeviceCommand = async (
    targets: Device[],
    desiredState: boolean,
    actionKey: 'lights' | 'locks',
    successMessage: string,
  ) => {
    if (!targets.length) {
      showToast('No devices available for this action.', { type: 'info' });
      return;
    }
    setQuickActionLoading(actionKey);
    try {
      if (isDemoMode) {
        // In demo mode, toggle each device using demo context
        targets.forEach((device) => {
          if (device.isActive !== desiredState) {
            demoToggleDevice(device.id);
          }
        });
      } else {
        await Promise.all(targets.map((device) => controlDevice(device.id, { isActive: desiredState })));
        refresh();
      }
      showToast(successMessage, { type: 'success' });
    } catch (error) {
      console.error('Quick action error:', error);
      showToast('Unable to complete action.', { type: 'error' });
    } finally {
      setQuickActionLoading(null);
    }
  };

  const handleToggleAllLights = async () => {
    const lights = devices.filter((device: Device) => device.type === 'light');
    const shouldTurnOn = lights.some((device: Device) => !device.isActive);
    await runBulkDeviceCommand(
      lights,
      shouldTurnOn,
      'lights',
      shouldTurnOn ? 'All lights have been turned on.' : 'All lights have been turned off.',
    );
  };

  const handleLockAllDoors = async () => {
    const locks = devices.filter((device: Device) => device.type === 'lock');
    await runBulkDeviceCommand(locks, true, 'locks', 'All doors secured');
  };

  const handleSceneActivate = async () => {
    setQuickActionLoading('scene');
    try {
      if (isDemoMode) {
        activateScene('s2'); // Activate "Evening Relax" scene
        setTimeout(() => {
          setQuickActionLoading(null);
          showToast('Evening scene activated', { type: 'success' });
        }, 500);
      } else {
        if (!activeScene) {
          showToast('No active scene available', { type: 'error' });
          setQuickActionLoading(null);
          return;
        }
        
        const sceneId = activeScene.id;
        if (!sceneId || !homeId) {
          showToast(sceneId ? 'Home ID is missing' : 'Scene ID is missing', { type: 'error' });
          setQuickActionLoading(null);
          return;
        }
        
        const client = getApiClient(async () => token);
        const scenesApi = ScenesApi(client);
        
        // Check if scene is currently active
        const isCurrentlyActive = activeScene.isActive === true || activeScene.is_active === true;
        
        if (isCurrentlyActive) {
          // Deactivate scene
          await scenesApi.deactivateScene(homeId, sceneId);
          showToast(`${activeScene.name} deactivated`, { type: 'info' });
        } else {
          // Activate scene
          await scenesApi.activateScene(homeId, sceneId);
          showToast(`${activeScene.name} activated`, { type: 'success' });
        }
        
        // Refresh scenes and home data to update UI
        await refresh();
        // Reload scenes to get updated active state
        const response = await scenesApi.listScenes(homeId);
        const scenesList = response.data?.scenes || response.data?.data?.scenes || response.data?.data || [];
        const scenesArray = Array.isArray(scenesList) ? scenesList : [];
        setScenes(scenesArray);
        const updatedActive = scenesArray.find((s: any) => (s.isActive === true || s.is_active === true)) || getTimeBasedScene(scenesArray);
        setActiveScene(updatedActive || null);
        
        setQuickActionLoading(null);
      }
    } catch (error: any) {
      console.error('Scene activation error:', error);
      console.error('Scene activation error response:', error?.response?.data);
      setQuickActionLoading(null);
      showToast(error?.response?.data?.message || 'Failed to toggle scene', { type: 'error' });
    }
  };

  // Device modal handlers
  const handleDeviceLongPress = (device: Device) => {
    setSelectedDevice(device);
    setShowDeviceModal(true);
  };

  const handleModalToggle = (deviceId: string) => {
    if (isDemoMode) {
      demoToggleDevice(deviceId);
    } else {
      controlDevice(deviceId, { isActive: !selectedDevice?.isActive });
      refresh();
    }
  };

  const handleModalSetValue = (deviceId: string, value: number) => {
    if (isDemoMode) {
      const demo = demoDevices.find((d: Device) => d.id === deviceId);
      if (demo) {
        demoToggleDevice(deviceId); // Toggle to update state in demo
      }
    } else {
      controlDevice(deviceId, { value });
      refresh();
    }
  };

  const handleMuteToggle = (deviceId: string, muted: boolean) => {
    if (isDemoMode) {
      setDeviceMuted(deviceId, muted);
      return;
    }

    const device = devices.find((d: Device) => d.id === deviceId) || selectedDevice;
    if (!device || (device.type as string) !== 'airguard') return;

    const smartMonitorId = (device.signalMappings as any)?.smartMonitorId ?? 1;
    const client = getApiClient(async () => token);
    const airguardApi = PublicAirguardApi(client);

    airguardApi
      .setBuzzer(smartMonitorId, muted ? 'OFF' : 'ON')
      .then(() => {
        setSelectedDevice((prev) => (prev && prev.id === deviceId ? { ...prev, alarmMuted: muted } : prev));
        refresh();
      })
      .catch((e) => {
        console.error('Failed to set Airguard buzzer state:', e);
      });
  };

  // Computed values
  const firstName = user?.name?.split(' ')[0] || 'Guest';
  const selectedRoomData = useMemo(() => {
    if (!selectedRoom) return null;
    const room = rooms.find((r: Room) => String(r.id) === String(selectedRoom));
    if (room) {
      console.log('[DashboardScreen] Selected room data:', {
        id: room.id,
        name: room.name,
        deviceCount: room.devices?.length || 0,
        devices: room.devices?.map((d: Device) => ({ id: d.id, name: d.name, roomId: d.roomId })) || [],
        temperature: room.temperature,
        humidity: room.humidity,
      });
    } else {
      console.warn('[DashboardScreen] Room not found:', selectedRoom, 'Available rooms:', rooms.map(r => ({ id: r.id, name: r.name })));
    }
    return room || null;
  }, [selectedRoom, rooms]);
  const activeDevicesCount = devices.filter((device: Device) => device.isActive).length;
  const onlineDevicesCount = devices.filter((device: Device) => device.isOnline !== false).length;
  // Check if any hub is actually online - use live status for AirGuard hubs, backend status for others
  const isHomeOnline = useMemo(() => {
    if (hubs.length === 0) {
      return false;
    }
    
    // Check each hub - for AirGuard hubs, prioritize live status over backend status
    const hubStatusChecks = hubs.map((hub) => {
      // For AirGuard hubs, always check live status first (it's more accurate)
      if (hub.hubType === 'airguard') {
        const liveStatus = hubStatuses[hub.id];
        // If we have live status data, use it (even if it's false/offline)
        // For AirGuard hubs, we trust live status over backend status
        if (liveStatus !== undefined) {
          return liveStatus; // Use live status from API (true = online, false = offline)
        }
        // If live status not fetched yet, default to offline (don't trust backend status for AirGuard)
        // This prevents showing "online" when hub is actually offline
        return false;
      }
      // For non-AirGuard hubs, use backend status
      const status = hub.status?.toLowerCase();
      return status === 'online';
    });
    
    const hasOnlineHub = hubStatusChecks.some(status => status === true);
    return hasOnlineHub;
  }, [hubs, hubStatuses]);
  const lightsOnCount = devices.filter((d: Device) => d.type === 'light' && d.isActive).length;
  const totalLights = devices.filter((d: Device) => d.type === 'light').length;
  const totalLocks = devices.filter((d: Device) => d.type === 'lock').length;
  
  // Get active scene device count
  const activeSceneDeviceCount = useMemo(() => {
    if (!activeScene) return 0;
    
    // Check for new format (deviceTypeRules)
    if (activeScene.deviceTypeRules || activeScene.device_type_rules) {
      const rules = activeScene.deviceTypeRules || activeScene.device_type_rules || [];
      let totalDevices = 0;
      
      rules.forEach((rule: any) => {
        if (rule.mode === 'specific' && rule.deviceIds) {
          totalDevices += rule.deviceIds.length;
        } else if (rule.mode === 'all') {
          // Count all devices of this type
          const typeDevices = devices.filter((d: Device) => d.type === rule.type);
          totalDevices += typeDevices.length;
        }
      });
      
      return totalDevices;
    }
    
    // Fallback to old format (deviceStates)
    const deviceStates = activeScene.deviceStates || activeScene.device_states || {};
    return Object.keys(deviceStates).length;
  }, [activeScene, devices]);
  
  const avgTemperature = rooms.length
    ? rooms.reduce((sum: number, room: Room) => sum + (room.temperature || 0), 0) / rooms.length
    : 0;
  const todayEnergy = (Array.isArray(energyData) ? energyData : []).reduce((sum, point) => sum + (point.total || 0), 0);

  // Get favorite/active devices for quick access
  const favoriteDevices = devices
    .filter((d: Device) => d.isActive || d.type === 'thermostat')
    .slice(0, 4);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Track if user explicitly selected a room
  const userSelectedRoomRef = useRef<string | null>(null);

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  const renderViewToggle = () => (
    <View style={styles.viewModeToggle}>
      {VIEW_MODE_ORDER.map((modeKey) => {
        const isActive = viewMode === modeKey;
        return (
          <TouchableOpacity
            key={modeKey}
            style={[styles.viewChip, isActive && styles.viewChipActive]}
            onPress={() => setViewMode(modeKey)}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewChipText, isActive && styles.viewChipTextActive]}>
              {modeKey.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderViewActions = () => (
    <View style={styles.viewIconActions}>
      <TouchableOpacity
        style={[
          styles.viewIconButton,
          isEditSession && styles.viewIconButtonActive,
          !canEditLayout && styles.viewIconButtonDisabled,
        ]}
        onPress={handleEditRoomsPress}
        activeOpacity={0.85}
        disabled={!canEditLayout}
      >
        {isEditSession ? (
          <Save size={18} color="#FFFFFF" />
        ) : (
          <Edit3 size={18} color={colors.primary} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewIconButton,
          styles.viewIconButtonPrimary,
          !canEditLayout && styles.viewIconButtonDisabled,
        ]}
        onPress={handleAddRoomPress}
        activeOpacity={0.85}
        disabled={!canEditLayout}
      >
        <Plus size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  // Loading skeleton
  if (loading && !refreshing && devices.length === 0) {
    return (
      <View style={styles.safeArea}>
        <Header showBack={false} showNotifications />
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <SkeletonLoader width="100%" height={180} borderRadius={borderRadius.xxl} />
          <View style={{ height: spacing.lg }} />
          <SkeletonLoader width="100%" height={80} borderRadius={borderRadius.xl} />
          <View style={{ height: spacing.lg }} />
          <SkeletonLoader width={120} height={20} borderRadius={borderRadius.md} />
          <View style={{ height: spacing.md }} />
          <View style={styles.skeletonRow}>
            <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.xl} />
            <SkeletonLoader width="48%" height={100} borderRadius={borderRadius.xl} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <Header showBack={false} showNotifications />
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero Welcome Card - Vealive Branded */}
        <Animated.View style={{ 
          transform: [{ scale: heroScale }], 
          opacity: heroOpacity 
        }}>
          <View style={styles.heroCardContainer}>
            {/* Animated gradient background with multiple layers */}
            <LinearGradient
              colors={['#0F1428', '#141A35', '#0A0E1F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCardBase}
            />
            
            {/* Neon glow overlays */}
            <View style={styles.heroGlowTop} />
            
            {/* Glass morphism overlay */}
            <LinearGradient
              colors={['rgba(79, 110, 247, 0.08)', 'rgba(179, 102, 255, 0.05)', 'rgba(0, 194, 255, 0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlassOverlay}
            />
            
            <View style={styles.heroContent}>
              {/* Top row with home name and status */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroHomeNameContainer}>
                  <View style={styles.heroHomeIcon}>
                    <HomeIcon size={16} color={colors.neonCyan} />
                  </View>
                  <Text style={styles.heroHomeName}>{home?.name || 'My Home'}</Text>
                </View>
                <StatusBadge 
                  key={`home-status-${isHomeOnline ? 'online' : 'offline'}-${Object.keys(hubStatuses).length}`}
                  variant={isHomeOnline ? 'online' : 'offline'} 
                  size="sm" 
                  label={isHomeOnline ? 'Connected' : 'Offline'}
                  pulse={isHomeOnline}
                />
              </View>
              
              {/* Greeting and status */}
              <View style={styles.heroGreetingContainer}>
                <Text style={styles.heroGreeting}>{getGreeting()}, {firstName}</Text>
                <View style={styles.heroStatusContainer}>
                  {!isHomeOnline ? (
                    <View style={styles.heroStatusBadge}>
                      <View style={[styles.heroStatusDot, { backgroundColor: colors.offline }]} />
                      <Text style={[styles.heroStatusText, { color: colors.foreground }]}>
                        System offline • No active connections
                      </Text>
                    </View>
                  ) : hasAlerts ? (
                    <View style={[styles.heroStatusBadge, styles.heroStatusBadgeAlert]}>
                      <View style={[styles.heroStatusDot, { backgroundColor: colors.warning }]} />
                      <Text style={[styles.heroStatusText, { color: colors.warning }]}>
                        Active alerts: {alertReasons.join(', ')}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.heroStatusBadge, styles.heroStatusBadgeSuccess]}>
                      <View style={[styles.heroStatusDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.heroStatusText, { color: colors.success }]}>
                        All systems operational • No issues detected
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Stats grid with improved design */}
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <LinearGradient
                    colors={[colors.neonCyan + '20', colors.neonCyan + '10']}
                    style={styles.heroStatIconGradient}
                  >
                    <HomeIcon size={16} color={colors.neonCyan} />
                  </LinearGradient>
                  <Text style={styles.heroStatValue}>{rooms.length}</Text>
                  <Text style={styles.heroStatLabel}>Rooms</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <LinearGradient
                    colors={[colors.primary + '20', colors.primary + '10']}
                    style={styles.heroStatIconGradient}
                  >
                    <Cpu size={16} color={colors.primary} />
                  </LinearGradient>
                  <Text style={styles.heroStatValue}>{hubs.length}</Text>
                  <Text style={styles.heroStatLabel}>Devices</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <LinearGradient
                    colors={[colors.success + '20', colors.success + '10']}
                    style={styles.heroStatIconGradient}
                  >
                    <Zap size={16} color={colors.success} />
                  </LinearGradient>
                  <Text style={styles.heroStatValue}>{todayEnergy.toFixed(1)}</Text>
                  <Text style={styles.heroStatLabel}>kWh Today</Text>
                </View>
              </View>
            </View>
            
            {/* Border glow effect */}
            <View style={styles.heroBorderGlow} />
          </View>
        </Animated.View>

        {/* Spatial View - Moved above Quick Actions */}
        <View style={styles.section}>
          <View style={styles.viewModeHeader}>
            <View style={styles.viewModeTitleRow}>
              <Text style={styles.viewModeTitle}>Floor Plan</Text>
              <View style={styles.viewModeTools}>
                {renderViewToggle()}
                {renderViewActions()}
              </View>
            </View>
          </View>
          
          <Animated.View style={[styles.viewModeWrapper, { opacity: viewContentFade, position: 'relative' }]}>
            {viewMode === '2d' ? (
              <InteractiveFloorPlan
                ref={floorPlanRef}
                onRoomSelect={handleRoomSelect}
                selectedRoom={selectedRoom}
                rooms={rooms}
                onLayoutUpdate={handleLayoutUpdate}
                onRoomCreate={handleRoomCreated}
                showToolbar={false}
                onEditModeChange={setIsFloorPlanEditing}
                showSelectedRoomInfo={false}
                homeId={homeId}
              />
            ) : (
              <NeonCard style={styles.model3dCard}>
                {home?.model3dUrl ? (
                  <View style={styles.model3dWrapper}>
                    <Model3DViewer modelUrl={home.model3dUrl} />
                  </View>
                ) : (
                  <View style={styles.model3dPlaceholder}>
                    <HomeIcon size={48} color={colors.mutedForeground} />
                    <Text style={styles.model3dPlaceholderText}>No 3D model available</Text>
                    <Text style={styles.model3dPlaceholderSubtext}>
                      Upload a model in settings
                    </Text>
                  </View>
                )}
              </NeonCard>
            )}
            
            {/* Room Popup Overlay - positioned ON the floor plan */}
            <RoomPopupCard
              room={selectedRoomData || null}
              visible={showRoomPopup}
              onClose={handleRoomPopupClose}
              onViewDetails={handleRoomViewDetails}
            />
          </Animated.View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader 
            title="Quick Actions" 
            action={{ label: 'All Scenes', onPress: () => navigation.navigate('Scenes') }}
          />
          <View style={styles.quickActionsGrid}>
            {/* Active Scene - always show, disabled if no active scene */}
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Moon}
                label={activeScene ? (activeScene.name || 'Active Scene') : 'No Active Scene'}
                sublabel={activeScene ? `${activeSceneDeviceCount} ${activeSceneDeviceCount === 1 ? 'device' : 'devices'}` : 'Create a scene first'}
                variant={(activeScene?.isActive === true || activeScene?.is_active === true) ? 'primary' : 'default'}
                onPress={activeScene ? handleSceneActivate : undefined}
                loading={quickActionLoading === 'scene'}
                disabled={!activeScene}
                isActive={activeScene?.isActive === true || activeScene?.is_active === true}
              />
            </View>
            
            {/* Lights - always show, disabled if no lights */}
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Lightbulb}
                label={totalLights > 0 ? (lightsOnCount > 0 ? 'Lights Off' : 'Lights On') : 'No Lights'}
                sublabel={totalLights > 0 ? `${lightsOnCount}/${totalLights} on` : 'Add lights first'}
                variant={lightsOnCount > 0 ? 'warning' : 'default'}
                onPress={totalLights > 0 ? handleToggleAllLights : undefined}
                loading={quickActionLoading === 'lights'}
                isActive={lightsOnCount > 0}
                disabled={totalLights === 0}
              />
            </View>
            
            {/* Lock All - always show, disabled if no locks */}
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Lock}
                label="Lock All"
                sublabel={totalLocks > 0 ? `${totalLocks} ${totalLocks === 1 ? 'lock' : 'locks'}` : 'No locks available'}
                variant="default"
                onPress={totalLocks > 0 ? handleLockAllDoors : undefined}
                loading={quickActionLoading === 'locks'}
                disabled={totalLocks === 0}
              />
            </View>
            
            {/* All Off - creative 4th card */}
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Zap}
                label="All Off"
                sublabel={`${activeDevicesCount} active`}
                variant="default"
                onPress={async () => {
                  if (activeDevicesCount === 0) {
                    showToast('All devices are already off', { type: 'info' });
                    return;
                  }
                  setQuickActionLoading('scene');
                  try {
                    const activeDevices = devices.filter((d: Device) => d.isActive && (d.type as string) !== 'airguard');
                    if (activeDevices.length > 0) {
                      await Promise.all(activeDevices.map((device) => controlDevice(device.id, { isActive: false })));
                      await refresh();
                      showToast('All devices turned off', { type: 'success' });
                    }
                  } catch (error) {
                    showToast('Failed to turn off devices', { type: 'error' });
                  } finally {
                    setQuickActionLoading(null);
                  }
                }}
                loading={quickActionLoading === 'scene'}
                disabled={activeDevicesCount === 0}
              />
            </View>
          </View>
        </View>

        {/* Favorite Devices */}
        {favoriteDevices.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Active Devices" 
              action={{ label: 'All Devices', onPress: () => {
                // Navigate to Devices tab via Dashboard
                (navigation as any).navigate('Dashboard', { screen: 'DevicesTab' });
              }}}
            />
            <View style={styles.devicesGrid}>
              {favoriteDevices.map((device) => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTile
                    icon={device.type}
                    name={device.name}
                    isActive={device.isActive}
                    isOnline={true}
                    value={device.value}
                    unit={device.unit}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={() => {
                      if (isDemoMode) {
                        demoToggleDevice(device.id);
                      } else {
                        controlDevice(device.id, { isActive: !device.isActive });
                        refresh();
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Energy Overview */}
        <View style={styles.section}>
          <SectionHeader 
            title="Energy" 
            action={{ label: 'Details', onPress: () => navigation.navigate('Energy') }}
          />
          <EnergyCard
            currentUsage={`${(todayEnergy / 24).toFixed(1)}`}
            unit="kW"
            trend="down"
            changePercent={12}
            period="Today"
            onPress={() => navigation.navigate('Energy')}
          />
        </View>

        {/* Scheduled */}
        <View style={styles.section}>
          <SectionHeader 
            title="Upcoming" 
            action={{ label: 'All Schedules', onPress: () => navigation.navigate('Schedules') }}
          />
          {schedules.length > 0 ? (
            <NeonCard style={styles.scheduleCard}>
              {schedules.map((schedule, index) => (
                <React.Fragment key={schedule.id}>
                  <View style={styles.scheduleItem}>
                    <View style={styles.scheduleIcon}>
                      <Clock size={18} color={colors.primary} />
                    </View>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.scheduleTitle}>{schedule.name}</Text>
                      <Text style={styles.scheduleTime}>
                        {schedule.days?.join(', ')} at {schedule.time}
                      </Text>
                    </View>
                    {schedule.enabled && (
                      <View style={styles.scheduleBadge}>
                        <Text style={styles.scheduleBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  {index < schedules.length - 1 && <View style={styles.scheduleDivider} />}
                </React.Fragment>
              ))}
            </NeonCard>
          ) : (
            <NeonCard style={styles.scheduleCard}>
              <View style={styles.emptySchedule}>
                <Clock size={32} color={colors.mutedForeground} />
                <Text style={styles.emptyScheduleText}>No schedules yet</Text>
                <TouchableOpacity
                  style={styles.addScheduleButton}
                  onPress={() => navigation.navigate('Schedules')}
                >
                  <Plus size={16} color={colors.primary} />
                  <Text style={styles.addScheduleText}>Add Schedule</Text>
                </TouchableOpacity>
              </View>
            </NeonCard>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Device Control Modal */}
      {selectedDevice && (
        <DeviceControlModal
          visible={showDeviceModal}
          device={selectedDevice}
          onClose={() => {
            setShowDeviceModal(false);
            setSelectedDevice(null);
          }}
          onToggle={handleModalToggle}
          onSetValue={handleModalSetValue}
          onToggleMute={handleMuteToggle}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, gradients: any, shadows: any) => {
  return StyleSheet.create({
    safeArea: {
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
    section: {
      marginBottom: spacing.xl,
    },
    skeletonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    // Hero Card - Vealive Branded Design
    heroCardContainer: {
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.neonPrimary,
    },
    heroCardBase: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroGlowTop: {
      position: 'absolute',
      top: -80,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: borderRadius.full,
      backgroundColor: colors.neonCyan,
      opacity: 0.15,
    },
    heroGlowBottom: {
      position: 'absolute',
      bottom: -60,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: borderRadius.full,
      backgroundColor: colors.neonPurple,
      opacity: 0.15,
    },
    heroGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    heroBorderGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: colors.primary + '30',
      pointerEvents: 'none',
    },
    heroContent: {
      padding: spacing.lg,
      position: 'relative',
      zIndex: 1,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    heroHomeNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroHomeIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.md,
      backgroundColor: colors.neonCyan + '20',
      borderWidth: 1,
      borderColor: colors.neonCyan + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroHomeName: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.foreground,
      letterSpacing: 0.5,
    },
    heroGreetingContainer: {
      marginBottom: spacing.lg,
    },
    heroGreeting: {
      fontSize: fontSize.xxxl,
      fontWeight: fontWeight.bold,
      color: colors.foreground,
      marginBottom: spacing.sm,
      letterSpacing: -0.5,
    },
    heroStatusContainer: {
      marginTop: spacing.xs,
    },
    heroStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      alignSelf: 'flex-start',
    },
    heroStatusBadgeSuccess: {
      backgroundColor: colors.success + '10',
      borderColor: colors.success + '20',
    },
    heroStatusBadgeAlert: {
      backgroundColor: colors.warning + '10',
      borderColor: colors.warning + '20',
    },
    heroStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    heroStatusText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.mutedForeground,
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    heroStatIconGradient: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    heroStatValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    heroStatLabel: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      fontWeight: fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroStatDivider: {
      width: 1,
      height: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      marginHorizontal: spacing.sm,
    },

    // Quick Actions
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    quickActionItem: {
      width: '48%',
      minWidth: 140,
    },

    // View Mode
    viewModeHeader: {
      marginBottom: spacing.md,
    },
    viewModeTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    viewModeTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.foreground,
    },
    viewModeTools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    viewModeWrapper: {
      marginTop: spacing.sm,
    },
    viewModeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    viewChipActive: {
      backgroundColor: colors.primary,
    },
    viewChipText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
    },
    viewChipTextActive: {
      color: '#FFFFFF',
    },
    viewIconActions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    viewIconButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewIconButtonPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    viewIconButtonActive: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    viewIconButtonDisabled: {
      opacity: 0.4,
    },

    // 3D Model
    model3dCard: {
      minHeight: 300,
    },
    model3dWrapper: {
      height: 300,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    model3dPlaceholder: {
      height: 250,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    model3dPlaceholderText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      color: colors.foreground,
    },
    model3dPlaceholderSubtext: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },

    // Room Preview
    roomPreviewTouchable: {
      marginTop: spacing.lg,
    },
    roomPreviewCard: {
      padding: spacing.md,
    },
    tapToEnterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary + '15',
      borderRadius: borderRadius.md,
    },
    tapToEnterText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.primary,
    },

    // Devices Grid
    devicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    deviceTileWrapper: {
      width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    },

    // Schedule
    scheduleCard: {
      padding: spacing.md,
    },
    scheduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    scheduleIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scheduleContent: {
      flex: 1,
    },
    scheduleTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.medium,
      color: colors.foreground,
      marginBottom: 2,
    },
    scheduleTime: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    scheduleBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.success + '20',
      borderRadius: borderRadius.md,
    },
    scheduleBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.success,
    },
    scheduleDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    emptySchedule: {
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    emptyScheduleText: {
      fontSize: fontSize.md,
      color: colors.mutedForeground,
    },
    addScheduleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary + '20',
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
    },
    addScheduleText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: '600',
    },
  });
};