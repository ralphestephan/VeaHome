import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  Lightbulb,
  Thermometer,
  Blinds,
  Tv,
  Shield,
  Plus,
  Sparkles,
} from 'lucide-react-native';
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  ThemeColors,
} from '../constants/theme';
import DeviceTileComponent from '../components/DeviceTile';
import DeviceControlModal from '../components/DeviceControlModal';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useHomeData } from '../hooks/useHomeData';
import { useHubs } from '../hooks/useHubs';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { getApiClient, HubApi, PublicAirguardApi } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import { useTheme } from '../context/ThemeContext';
import { useDemo } from '@/context/DemoContext';
import {
  NeonCard,
  SectionHeader,
  SkeletonLoader,
  EmptyState,
  StatusBadge,
} from '../components/ui';
import type { RootStackParamList, Device } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Use c.gif for hero animation
const smartHomeImage = require('../../assets/c.gif');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DevicesScreen() {
  const layout = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);
  const { user, token } = useAuth();
  const homeId = user?.homeId;
  console.log('[DevicesScreen] HomeId:', homeId, 'User:', user?.email);
  const { devices: homeDevices, rooms: homeRooms, loading, refresh, isDemoMode } = useHomeData(homeId);
  const demo = useDemo();

  // Use demo data if in demo mode
  const devices: Device[] = isDemoMode ? (demo.devices || []) : (homeDevices || []);
  const rooms = isDemoMode ? (demo.rooms || []) : (homeRooms || []);

  const { hubs: fetchedHubs, refresh: refreshHubs } = useHubs(homeId);
  console.log('[DevicesScreen] Fetched hubs:', fetchedHubs?.length || 0);
  const hubs = Array.isArray(fetchedHubs) ? fetchedHubs : [];
  const { toggleDevice, setValue, loading: deviceLoading } = useDeviceControl();
  const [index, setIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVealiveModal, setShowVealiveModal] = useState(false);

  // Track live online/offline status for hubs
  const [hubStatuses, setHubStatuses] = useState<Record<string, boolean>>({});

  // Track previous statuses to only refresh on change
  const prevDeviceStatusesRef = useRef<Record<string, boolean>>({});
  const prevHubStatusesRef = useRef<Record<string, boolean>>({});

  // Scroll position refs for each tab
  const scrollPositionsRef = useRef<Record<number, number>>({});

  // Modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch live status for airguard hubs
  useEffect(() => {
    const airguardHubs = hubs.filter(h => h.hubType === 'airguard');
    if (airguardHubs.length === 0) return;

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
      });

      // Only update state if status changed - don't refresh the whole page
      const hasChanged = Object.keys(newStatuses).some(hubId =>
        newStatuses[hubId] !== prevHubStatusesRef.current[hubId]
      ) || Object.keys(prevHubStatusesRef.current).some(hubId =>
        prevHubStatusesRef.current[hubId] !== newStatuses[hubId]
      );

      if (hasChanged) {
        prevHubStatusesRef.current = newStatuses;
        // Only update state - this will cause device cards to re-render without full page refresh
        setHubStatuses(newStatuses);
      } else {
        // Still update state even if no change to keep it in sync
        setHubStatuses(newStatuses);
      }
    };

    fetchStatuses();
    // Increase interval to 5 seconds to reduce unnecessary polling
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [hubs, token]);

  // Real-time updates - don't refresh, just update state
  // The useRealtime hook will trigger re-renders when devices change
  // We don't need to call refresh() here as it causes full page refresh
  useRealtime({
    onDeviceUpdate: () => {
      // Don't call refresh() - let the realtime updates handle state changes
      // This prevents full page refresh and scroll jumping
    },
  });

  // Update prevDeviceStatusesRef when devices change
  useEffect(() => {
    const currentStatuses: Record<string, boolean> = {};
    devices.forEach(d => {
      currentStatuses[d.id] = d.isActive || false;
    });
    prevDeviceStatusesRef.current = currentStatuses;
  }, [devices]);

  // Auto-refresh when screen gains focus - but only if coming from another screen
  // Don't refresh if just switching tabs, as it causes scroll jump
  useFocusEffect(
    useCallback(() => {
      // Only refresh on initial focus or when explicitly needed
      // This prevents unnecessary refreshes when switching tabs
      const shouldRefresh = true; // Set to false if you want to disable auto-refresh on focus
      if (shouldRefresh) {
        // Use a small delay to prevent scroll jump
        setTimeout(() => {
          refresh();
        }, 100);
      }
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshHubs()]);
    setRefreshing(false);
  }, [refresh, refreshHubs]);

  const [routes] = useState([
    { key: 'lighting', title: 'Lights' },
    { key: 'climate', title: 'Climate' },
    { key: 'windows', title: 'Windows' },
    { key: 'media', title: 'Media' },
  ]);

  // Map hub types to categories (for client-facing display)
  const getHubCategory = (hubType: string) => {
    const categoryMap: Record<string, string> = {
      'airguard': 'climate', // Air quality monitoring
      'ir_blaster': 'media', // Controls various devices
      'zigbee': 'lighting', // Often used for smart lights
      'matter': 'media',
      'wifi': 'media',
    };
    return categoryMap[hubType] || 'media';
  };

  // Filter hubs by category (shown as "devices" to client)
  const climateHubs = hubs.filter(h => getHubCategory(h.hubType || 'media') === 'climate');
  const windowsHubs = hubs.filter(h => getHubCategory(h.hubType || 'media') === 'windows');
  const mediaHubs = hubs.filter(h => getHubCategory(h.hubType || 'media') === 'media');
  const lightingHubs = hubs.filter(h => getHubCategory(h.hubType || 'media') === 'lighting');

  // Filter devices by category - hubs are already included in devices array from useHomeData
  // Only add hubs separately if they're NOT already in the devices array (to avoid duplicates)
  const climateDevices = [
    ...devices.filter(d => d.category === 'climate' || d.type === 'thermostat' || d.type === 'ac' || d.type === 'airguard'),
    ...climateHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const isOnline = hubStatuses[h.id] !== undefined ? hubStatuses[h.id] : (h.status === 'online');
        // Use roomId from hub, ensuring it's a string
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        console.log('[DevicesScreen] Mapping climate hub:', { hubId: h.id, hubName: h.name, roomId, hasRoomId: !!h.roomId, hasRoom_id: !!h.room_id });
        return {
          id: h.id,
          name: h.name,
          type: h.hubType || 'airguard',
          category: 'climate' as const,
          isActive: isOnline,
          value: undefined,
          unit: undefined,
          roomId: roomId,
          homeId: h.homeId,
          hubId: h.id,
          status: isOnline ? 'online' : 'offline',
          hubType: h.hubType,
          serialNumber: h.serialNumber,
          metadata: h.metadata
        } as any;
      })
  ];
  const windowDevices = [
    ...devices.filter(d => d.category === 'windows' || d.type === 'blind' || d.type === 'shutter'),
    ...windowsHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        return {
          id: h.id,
          name: h.name,
          type: h.hubType,
          category: 'windows' as const,
          isActive: h.status === 'online',
          value: undefined,
          unit: undefined,
          roomId: roomId,
          homeId: h.homeId,
          hubId: h.id,
          status: h.status
        } as any;
      })
  ];
  const mediaDevices = [
    ...devices.filter(d => d.category === 'media' || d.type === 'tv' || d.type === 'speaker' || d.type === 'ir_blaster'),
    ...mediaHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        return {
          id: h.id,
          name: h.name,
          type: h.hubType,
          category: 'media' as const,
          isActive: h.status === 'online',
          value: undefined,
          unit: undefined,
          roomId: roomId,
          homeId: h.homeId,
          hubId: h.id,
          status: h.status
        } as any;
      })
  ];
  const lightsDevices = [
    ...devices.filter(d => d.category === 'lighting' || d.type === 'light'),
    ...lightingHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        return {
          id: h.id,
          name: h.name,
          type: h.hubType,
          category: 'lighting' as const,
          isActive: h.status === 'online',
          value: undefined,
          unit: undefined,
          roomId: roomId,
          homeId: h.homeId,
          hubId: h.id,
          status: h.status
        } as any;
      })
  ];

  // Calculate device counts: total and online
  // Note: hubs are already included in the devices array from useHomeData
  const deviceCounts = useMemo(() => {
    // Total count is just devices.length (hubs are already included)
    const total = devices.length;

    // Create a set of hub IDs for quick lookup
    const hubIds = new Set(hubs.map(h => String(h.id)));

    // Count online devices
    // For devices that are hubs, check live status if available
    const online = devices.filter(d => {
      const deviceId = String(d.id);
      const isHub = hubIds.has(deviceId);

      if (isHub) {
        // For hubs, check live status for AirGuard, or backend status for others
        const hub = hubs.find(h => String(h.id) === deviceId);
        if (!hub) return false;

        if (hub.hubType === 'airguard') {
          const liveStatus = hubStatuses[hub.id];
          if (liveStatus !== undefined) return liveStatus;
          return false; // Default to offline if live status not available
        }
        return hub.status === 'online';
      }

      // For regular devices, check isOnline
      return d.isOnline !== false;
    }).length;

    return { total, online };
  }, [devices, hubs, hubStatuses]);

  // Group devices by room
  const devicesByRoom = (deviceList: typeof devices) => {
    const grouped: Record<string, typeof devices> = {};
    deviceList.forEach(device => {
      if (!grouped[device.roomId]) grouped[device.roomId] = [];
      grouped[device.roomId].push(device);
    });
    return grouped;
  };

  const handleDeviceToggle = async (device: Device) => {
    if (isDemoMode) {
      demo.toggleDevice(device.id);
    } else {
      await toggleDevice(device.id, device.isActive);
      refresh();
    }
  };

  const handleDeviceLongPress = (device: Device) => {
    console.log('[DevicesScreen] Opening modal for device:', {
      id: device.id,
      name: device.name,
      type: device.type,
      category: device.category
    });
    setSelectedDevice(device);
    setModalVisible(true);
  };

  const handleModalToggle = (deviceId: string) => {
    if (isDemoMode) {
      demo.toggleDevice(deviceId);
    } else {
      toggleDevice(deviceId, selectedDevice?.isActive ?? false);
      refresh();
    }
  };

  const handleModalSetValue = (deviceId: string, value: number) => {
    if (isDemoMode) {
      demo.setDeviceValue(deviceId, value);
    } else {
      setValue(deviceId, value, selectedDevice?.unit);
      refresh();
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    Alert.alert(
      'Delete Device',
      'Are you sure you want to delete this device? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isDemoMode) {
                console.log('[DevicesScreen] Demo mode: simulating delete');
                setModalVisible(false);
                return;
              }

              const device = devices.find((d) => d.id === deviceId) || selectedDevice;
              const isHub = device && 'hubType' in device;

              if (isHub) {
                // Delete hub via API
                const api = await getApiClient();
                const hubApi = new HubApi(api);
                await hubApi.deleteHub(homeId!, deviceId);
                console.log('[DevicesScreen] Hub deleted:', deviceId);
                await refreshHubs();
              } else {
                // Delete regular device
                // TODO: Implement device deletion endpoint
                console.log('[DevicesScreen] Regular device deletion not yet implemented');
              }

              setModalVisible(false);
              await refresh();
            } catch (error) {
              console.error('[DevicesScreen] Error deleting device:', error);
              Alert.alert('Error', 'Failed to delete device. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleMuteToggle = (deviceId: string, muted: boolean) => {
    if (isDemoMode) {
      demo.setDeviceMuted(deviceId, muted);
      return;
    }

    const device = devices.find((d) => d.id === deviceId) || selectedDevice;
    if (!device || device.type !== 'airguard') return;

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

  const getRoomName = (roomId: string) => {
    if (!roomId) return 'No room assigned';
    return rooms.find((r: { id: string; name: string }) => r.id === roomId)?.name || roomId;
  };

  const getDeviceIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      light: 'lightbulb',
      thermostat: 'thermometer',
      ac: 'ac',
      tv: 'television',
      speaker: 'speaker',
      camera: 'camera',
      lock: 'lock',
      blind: 'shutter',
      shutter: 'shutter',
      airguard: 'airguard',
    };
    return iconMap[type] || 'lightbulb';
  };

  // Calculate overall hub status - check if any hub is online
  const overallHubStatus = useMemo(() => {
    if (hubs.length === 0) return 'offline';
    // Check both hub.status and hubStatuses (for airguard hubs with live status)
    const hasOnlineHub = hubs.some((hub) => {
      const liveStatus = hubStatuses[hub.id];
      if (liveStatus !== undefined) return liveStatus;
      return hub.status === 'online';
    });
    return hasOnlineHub ? 'online' : 'offline';
  }, [hubs, hubStatuses]);

  const LightsRoute = () => {
    const groupedDevices = devicesByRoom(lightsDevices);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (lightsDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lights found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <View key={roomId} style={styles.deviceSection}>
            <Text style={styles.deviceSectionTitle}>{getRoomName(roomId)}</Text>
            <View style={styles.devicesGrid}>
              {roomDevices.map(device => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTileComponent
                    icon={getDeviceIcon(device.type)}
                    name={device.name}
                    value={device.value}
                    unit={device.unit || '%'}
                    isActive={device.isActive}
                    isOnline={(() => {
                      // For hubs, use live status from hubStatuses
                      if (device.hubId && hubs.some(h => h.id === device.id)) {
                        const liveStatus = hubStatuses[device.id];
                        return liveStatus !== undefined ? liveStatus : (device.isOnline !== false);
                      }
                      return device.isOnline !== false;
                    })()}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={device.type !== 'airguard' ? () => handleDeviceToggle(device) : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const ClimateRoute = () => {
    const groupedDevices = devicesByRoom(climateDevices);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (climateDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No climate devices found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <View key={roomId} style={styles.deviceSection}>
            <Text style={styles.deviceSectionTitle}>{getRoomName(roomId)}</Text>
            <View style={styles.devicesGrid}>
              {roomDevices.map(device => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTileComponent
                    icon={getDeviceIcon(device.type)}
                    name={device.name}
                    value={device.value}
                    unit={device.unit || '°C'}
                    isActive={device.isActive}
                    isOnline={(() => {
                      // For hubs, use live status from hubStatuses
                      if (device.hubId && hubs.some(h => h.id === device.id)) {
                        const liveStatus = hubStatuses[device.id];
                        return liveStatus !== undefined ? liveStatus : (device.isOnline !== false);
                      }
                      return device.isOnline !== false;
                    })()}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={device.type !== 'airguard' ? () => handleDeviceToggle(device) : undefined}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const WindowsRoute = () => {
    const groupedDevices = devicesByRoom(windowDevices);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (windowDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No window devices found</Text>
        </View>
      );
    }

    return (
      <ScrollView
        ref={(ref) => {
          if (ref) {
            const savedPosition = scrollPositionsRef.current[2];
            if (savedPosition) {
              setTimeout(() => ref.scrollTo({ y: savedPosition, animated: false }), 100);
            }
          }
        }}
        style={styles.tabContent}
        contentContainerStyle={styles.tabScrollContent}
        onScroll={(e) => {
          scrollPositionsRef.current[2] = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <View key={roomId} style={styles.deviceSection}>
            <Text style={styles.deviceSectionTitle}>{getRoomName(roomId)}</Text>
            <View style={styles.devicesGrid}>
              {roomDevices.map(device => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTileComponent
                    icon={getDeviceIcon(device.type)}
                    name={device.name}
                    value={device.value}
                    unit={device.unit || '%'}
                    isActive={device.isActive}
                    isOnline={(() => {
                      // For hubs, use live status from hubStatuses
                      if (device.hubId && hubs.some(h => h.id === device.id)) {
                        const liveStatus = hubStatuses[device.id];
                        return liveStatus !== undefined ? liveStatus : (device.isOnline !== false);
                      }
                      return device.isOnline !== false;
                    })()}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={() => handleDeviceToggle(device)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const UtilityRoute = () => { // Renamed to MediaRoute conceptually, but keeping UtilityRoute function name for now
    const groupedDevices = devicesByRoom(mediaDevices);

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (mediaDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No media devices found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <View key={roomId} style={styles.deviceSection}>
            <Text style={styles.deviceSectionTitle}>{getRoomName(roomId)}</Text>
            <View style={styles.devicesGrid}>
              {roomDevices.map(device => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTileComponent
                    icon={getDeviceIcon(device.type)}
                    name={device.name}
                    value={device.value}
                    unit={device.unit}
                    isOnline={(() => {
                      // For hubs, use live status from hubStatuses
                      if (device.hubId && hubs.some(h => h.id === device.id)) {
                        const liveStatus = hubStatuses[device.id];
                        return liveStatus !== undefined ? liveStatus : (device.isOnline !== false);
                      }
                      return device.isOnline !== false;
                    })()}
                    isActive={device.isActive}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={() => handleDeviceToggle(device)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const SecurityRoute = () => { // This route is no longer used in the new TabView structure
    const groupedDevices = devicesByRoom([]); // Empty array as security tab is removed

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (groupedDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No security devices found</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
        {Object.entries(groupedDevices).map(([roomId, roomDevices]) => (
          <View key={roomId} style={styles.deviceSection}>
            <Text style={styles.deviceSectionTitle}>{getRoomName(roomId)}</Text>
            <View style={styles.devicesGrid}>
              {roomDevices.map(device => (
                <View key={device.id} style={styles.deviceTileWrapper}>
                  <DeviceTileComponent
                    icon={getDeviceIcon(device.type)}
                    name={device.name}
                    value={device.value}
                    unit={device.unit}
                    isOnline={(() => {
                      // For hubs, use live status from hubStatuses
                      if (device.hubId && hubs.some(h => h.id === device.id)) {
                        const liveStatus = hubStatuses[device.id];
                        return liveStatus !== undefined ? liveStatus : (device.isOnline !== false);
                      }
                      return device.isOnline !== false;
                    })()}
                    isActive={device.isActive}
                    type={device.type}
                    onPress={() => handleDeviceLongPress(device)}
                    onToggle={() => handleDeviceToggle(device)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderScene = SceneMap({
    climate: ClimateRoute,
    security: SecurityRoute, // This will not be rendered based on new routes
    utility: UtilityRoute, // This will not be rendered based on new routes
    lighting: LightsRoute,
  });

  const renderTabBar = (props: any) => (
    <View style={styles.tabBarContainer}>
      <TabBar
        {...props}
        renderLabel={({ route, focused }) => (
          <Text style={[
            styles.tabLabel,
            focused && styles.tabLabelFocused
          ]}>
            {route.title}
          </Text>
        )}
        indicatorStyle={styles.tabIndicator}
        style={styles.tabBar}
        tabStyle={styles.tab}
        pressColor="transparent"
        scrollEnabled
      />
    </View>
  );

  return (
    <LinearGradient
      colors={gradients.deepPurple || ['#2E1065', '#0F172A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Devices</Text>
            <Text style={styles.headerSubtitle}>
              {(() => {
                const totalDevices = devices.length + hubs.length;
                const onlineDevices = [...devices, ...hubs].filter(d => d.isOnline !== false).length;
                return `${onlineDevices} of ${totalDevices} devices connected`;
              })()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.neonCyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Device</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hero Section with GIF */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={require('../../assets/SmartHome_DM_1.gif')}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(26, 15, 46, 0.7)', 'rgba(10, 5, 20, 0.95)']}
              style={styles.heroOverlay}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Sparkles size={14} color="#4D7BFE" />
                  <Text style={styles.heroBadgeText}>Smart Home Control</Text>
                </View>
                <Text style={styles.heroTitle}>Manage Your Devices</Text>
                <Text style={styles.heroSubtitle}>
                  Control all your smart devices from one place
                </Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <TabView
          navigationState={{ index, routes }}
          renderScene={({ route }) => {
            switch (route.key) {
              case 'lighting': return <LightsRoute />;
              case 'climate': return <ClimateRoute />;
              case 'windows': return <WindowsRoute />; // Need to Ensure WindowsRoute is defined and used
              case 'media': return <UtilityRoute /> as any;
              default: return null;
            }
          }}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
          lazy
        />
      </SafeAreaView>

      {/* Device Control Modal */}
      <DeviceControlModal
        visible={modalVisible}
        device={selectedDevice}
        onClose={() => {
          setModalVisible(false);
          setSelectedDevice(null);
        }}
        onToggle={handleModalToggle}
        onSetValue={handleModalSetValue}
        onToggleMute={handleMuteToggle}
        onDelete={async (deviceId) => {
          if (isDemoMode) {
            setModalVisible(false);
            setSelectedDevice(null);
            return;
          }
          // Logic for deleting device
          try {
            const api = HubApi(getApiClient(async () => token));
            const isHub = hubs.some(h => h.id === deviceId);

            if (isHub) {
              await api.deleteHub(homeId!, deviceId);
              await refreshHubs();
            } else {
              await api.deleteDevice(homeId!, deviceId);
            }

            setModalVisible(false);
            setSelectedDevice(null);
            await refresh();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete device');
          }
        }}
        onUpdateName={async (deviceId, newName) => {
          if (isDemoMode) return;
          try {
            const api = HubApi(getApiClient(async () => token));
            const isHub = hubs.some(h => h.id === deviceId);

            if (isHub) {
              await api.updateHub(homeId!, deviceId, { name: newName });
              await refreshHubs();
            } else {
              // Not implemented for regular devices yet? Using logic from previous file
              console.log('Update name for regular device not implemented');
            }
            await refresh();
          } catch (e) {
            console.error(e);
          }
        }}
        onUpdateRoom={async (deviceId, roomId) => {
          if (isDemoMode) return;
          try {
            const api = HubApi(getApiClient(async () => token));
            const isHub = hubs.some(h => h.id === deviceId);
            if (isHub) {
              await api.updateHub(homeId!, deviceId, { roomId });
              await refreshHubs();
            } else {
              await api.updateDevice(homeId!, deviceId, { roomId });
            }
            await refresh();
          } catch (e) {
            console.error(e);
          }
        }}
        rooms={rooms}
      />


      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Device</Text>
            <Text style={styles.modalDescription}>Choose device type to add</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowAddModal(false);
                setShowVealiveModal(true);
              }}
            >
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>Vealive Device</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowAddModal(false);
                navigation.navigate('TuyaIntegration', { homeId });
              }}
            >
              <View style={styles.modalButtonSecondary}>
                <Text style={styles.modalButtonSecondaryText}>Tuya/eWeLink Device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vealive Device Type Modal */}
      <Modal
        visible={showVealiveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVealiveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vealive Device</Text>
            <Text style={styles.modalDescription}>Select your device type</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowVealiveModal(false);
                navigation.navigate('BLEDeviceWizard', {
                  homeId: homeId,
                  hubId: hubs?.[0]?.id,
                  roomId: rooms?.[0]?.id, // Use first room as default
                  deviceType: 'SmartMonitor'
                });
              }}
            >
              <LinearGradient
                colors={gradients.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.modalButtonText}>AirGuard</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowVealiveModal(false);
                Alert.alert('Coming Soon', 'VeaHub setup coming soon!');
              }}
            >
              <View style={styles.modalButtonSecondary}>
                <Text style={styles.modalButtonSecondaryText}>VeaHub</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowVealiveModal(false);
                Alert.alert('Coming Soon', 'VeaRelay setup coming soon!');
              }}
            >
              <View style={styles.modalButtonSecondary}>
                <Text style={styles.modalButtonSecondaryText}>VeaRelay</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowVealiveModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background, // Will be overridden by LinearGradient
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: 'white',
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.6)',
      marginTop: 4,
      fontWeight: '500',
    },
    addButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    addButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    heroContainer: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    heroImage: {
      height: 160,
      width: '100%',
    },
    heroOverlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    heroContent: {
      gap: spacing.xs,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: 'rgba(77, 123, 254, 0.15)',
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(77, 123, 254, 0.3)',
    },
    heroBadgeText: {
      color: '#4D7BFE',
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
      marginTop: spacing.xs,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '500',
      marginTop: 2,
    },
    tabBarContainer: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.05)', // Frosted glass background
      borderRadius: borderRadius.xl,
      marginHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    tabBar: {
      backgroundColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    },
    tab: {
      width: 'auto',
      paddingHorizontal: spacing.lg,
      minHeight: 48, // Increased for better touch target
    },
    tabLabel: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.5)',
      fontWeight: '600',
      textTransform: 'none',
    },
    tabLabelFocused: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 15,
    },
    tabIndicator: {
      backgroundColor: '#4D7BFE', // Neon blue accent
      height: 3,
      borderRadius: 2,
    },
    tabContent: {
      flex: 1,
    },
    tabScrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 100,
    },
    deviceSection: {
      marginBottom: spacing.xl,
    },
    deviceSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.6)', // Improved contrast
      marginBottom: spacing.md,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    devicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    deviceTileWrapper: {
      width: (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 100,
    },
    loadingText: {
      color: 'rgba(255, 255, 255, 0.5)',
      marginTop: spacing.md,
      fontSize: 14,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 100,
    },
    emptyText: {
      color: 'rgba(255, 255, 255, 0.3)',
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      backgroundColor: '#1E1E1E', // Darker modal background
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...shadows.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: 'white',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    modalDescription: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    modalButton: {
      marginBottom: spacing.md,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    modalButtonGradient: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    modalButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonSecondary: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: borderRadius.md,
    },
    modalButtonSecondaryText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    modalCancelButton: {
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    modalCancelText: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 16,
      textAlign: 'center',
    },
    offlineBanner: {
      backgroundColor: colors.destructive,
      padding: spacing.xs,
      alignItems: 'center',
    },
    offlineBannerText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    vealiveModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    vealiveModalContent: {
      width: '80%',
      padding: spacing.xl,
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      padding: spacing.xs,
    },
    closeButtonText: {
      color: colors.mutedForeground,
      fontSize: 20,
    },
    vealiveTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    vealiveSubtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
    },
  });