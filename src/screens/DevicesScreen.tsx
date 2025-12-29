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
    { key: 'climate', title: 'Climate' },
    { key: 'security', title: 'Security' },
    { key: 'utility', title: 'Utility' },
    { key: 'lighting', title: 'Lighting' },
  ]);

  // Map hub types to categories (for client-facing display)
  const getHubCategory = (hubType: string) => {
    const categoryMap: Record<string, string> = {
      'airguard': 'climate', // Air quality monitoring
      'ir_blaster': 'utility', // Controls various devices
      'zigbee': 'lighting', // Often used for smart lights
      'matter': 'utility',
      'wifi': 'utility',
    };
    return categoryMap[hubType] || 'utility';
  };

  // Filter hubs by category (shown as "devices" to client)
  const climateHubs = hubs.filter(h => getHubCategory(h.hubType || 'utility') === 'climate');
  const securityHubs = hubs.filter(h => getHubCategory(h.hubType || 'utility') === 'security');
  const utilityHubs = hubs.filter(h => getHubCategory(h.hubType || 'utility') === 'utility');
  const lightingHubs = hubs.filter(h => getHubCategory(h.hubType || 'utility') === 'lighting');

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
          roomId: roomId, // Use the properly extracted roomId
        homeId: h.homeId,
        status: isOnline ? 'online' : 'offline',
        hubType: h.hubType,
        serialNumber: h.serialNumber,
        metadata: h.metadata
      };
    })
  ];
  const securityDevices = [
    ...devices.filter(d => d.category === 'security' || d.type === 'camera' || d.type === 'lock'),
    ...securityHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        return {
      id: h.id,
      name: h.name,
      type: h.hubType,
      category: 'security' as const,
      isActive: h.status === 'online',
      value: undefined,
      unit: undefined,
          roomId: roomId,
      homeId: h.homeId,
      status: h.status
        };
      })
  ];
  const utilityDevices = [
    ...devices.filter(d => d.category === 'utility' || d.type === 'tv' || d.type === 'speaker'),
    ...utilityHubs
      .filter(h => !devices.some(d => String(d.id) === String(h.id))) // Only add hubs not already in devices
      .map(h => {
        const roomId = h.roomId ? String(h.roomId) : (h.room_id ? String(h.room_id) : '');
        return {
      id: h.id,
      name: h.name,
      type: h.hubType,
      category: 'utility' as const,
      isActive: h.status === 'online',
      value: undefined,
      unit: undefined,
          roomId: roomId,
      homeId: h.homeId,
      status: h.status
        };
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
      status: h.status
        };
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

  const UtilityRoute = () => {
    const groupedDevices = devicesByRoom(utilityDevices);
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (utilityDevices.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No utility devices found</Text>
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

  const SecurityRoute = () => {
    const groupedDevices = devicesByRoom(securityDevices);
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      );
    }

    if (securityDevices.length === 0) {
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
    security: SecurityRoute,
    utility: UtilityRoute,
    lighting: LightsRoute,
  });

  const renderTabBar = (props: any) => (
    <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabBarWrapper}>
      <TabBar
        {...props}
        indicatorStyle={{ backgroundColor: 'transparent' }}
        style={styles.tabBar}
        tabStyle={styles.tab}
        renderLabel={({ route, focused }: { route: any; focused: boolean }) => (
          focused ? (
            <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tabButton}>
              <Text style={styles.tabTextActive} numberOfLines={1} ellipsizeMode="clip">
                {route.title}
              </Text>
            </LinearGradient>
          ) : (
            <View style={[styles.tabButton, styles.tabButtonInactive]}>
              <Text style={styles.tabText} numberOfLines={1} ellipsizeMode="clip">
                {route.title}
              </Text>
            </View>
          )
        )}
      />
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <Header title="Devices" />
      <View style={styles.subHeader}>
        <View style={styles.subHeaderLeft}>
          <Text style={styles.subtitle}>
            {deviceCounts.online === 0 
              ? `0 devices connected`
              : deviceCounts.online === deviceCounts.total
              ? `${deviceCounts.online} ${deviceCounts.online === 1 ? 'device' : 'devices'} connected`
              : `${deviceCounts.online} ${deviceCounts.online === 1 ? 'device' : 'devices'} out of ${deviceCounts.total} ${deviceCounts.total === 1 ? 'device' : 'devices'} connected`
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButtonWrapper}
          onPress={() => setShowAddModal(true)}
        >
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Add Device</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={smartHomeImage}
          style={styles.heroImage}
          imageStyle={styles.heroImageStyle}
        >
          <LinearGradient
            colors={['transparent', 'rgba(19, 21, 42, 0.9)']}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle}>All Devices</Text>
            <Text style={styles.heroSubtitle}>Control everything from one place</Text>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Tabs */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />

      {/* Device Control Modal */}
      {selectedDevice && (
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
          onDelete={(deviceId) => {
            if (isDemoMode) {
              setModalVisible(false);
              setSelectedDevice(null);
              return;
            }
            if (!homeId) return;
            Alert.alert('Remove Device', 'Are you sure you want to remove this device?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  try {
                    console.log('[DevicesScreen] Deleting device:', deviceId, 'from home:', homeId);
                    const api = HubApi(getApiClient(async () => token));
                    
                    // Check if this is a hub - look in hubs array
                    const isHub = hubs.some(h => h.id === deviceId);
                    
                    // Delete from backend
                    if (isHub) {
                      console.log('[DevicesScreen] Deleting hub:', deviceId);
                      await api.deleteHub(homeId, deviceId);
                    } else {
                      console.log('[DevicesScreen] Deleting regular device:', deviceId);
                      await api.deleteDevice(homeId, deviceId);
                    }
                    console.log('[DevicesScreen] Device deleted successfully from backend');
                    
                    // Close modal immediately
                    setModalVisible(false);
                    setSelectedDevice(null);
                    
                    // Force immediate refresh to clear cache
                    console.log('[DevicesScreen] Force refreshing device list...');
                    setRefreshing(true);
                    await refresh();
                    await refreshHubs();
                    setRefreshing(false);
                    console.log('[DevicesScreen] Device list refreshed and cache cleared');
                  } catch (e: any) {
                    console.error('[DevicesScreen] Failed to delete device:', e);
                    console.error('[DevicesScreen] Error response:', e.response?.data);
                    Alert.alert('Error', e.response?.data?.error || 'Failed to delete device');
                    setRefreshing(false);
                  }
                },
              },
            ]);
          }}
          onUpdateName={async (deviceId, newName) => {
            if (isDemoMode) return;
            if (!homeId) return;
            try {
              console.log('[DevicesScreen] Updating device name:', deviceId, 'to:', newName);
              const api = HubApi(getApiClient(async () => token));
              
              // Check if this is a hub
              const isHub = hubs.some(h => h.id === deviceId);
              
              if (isHub) {
                await api.updateHub(homeId, deviceId, { name: newName });
                console.log('[DevicesScreen] Hub name updated successfully');
              } else {
                // Update regular device name (you'll need to add this API method)
                console.log('[DevicesScreen] Regular device name update not yet implemented');
              }
              
              // Refresh to show updated name
              await Promise.all([refresh(), refreshHubs()]);
            } catch (e: any) {
              console.error('[DevicesScreen] Failed to update device name:', e);
              Alert.alert('Error', e.response?.data?.error || 'Failed to update device name');
            }
          }}
          onUpdateRoom={async (deviceId, roomId) => {
            console.log('[DevicesScreen] onUpdateRoom called:', { deviceId, roomId, isDemoMode, homeId });
            if (isDemoMode) {
              console.log('[DevicesScreen] Demo mode - skipping room update');
              return;
            }
            if (!homeId) {
              console.log('[DevicesScreen] No homeId - cannot update room');
              return;
            }
            try {
              console.log('[DevicesScreen] Updating device room:', deviceId, 'to:', roomId);
              console.log('[DevicesScreen] Available hubs:', hubs.map(h => ({ id: h.id, name: h.name })));
              
              // Check if this is a hub
              const isHub = hubs.some(h => h.id === deviceId);
              console.log('[DevicesScreen] Is hub?', isHub);
              
              if (isHub) {
                console.log('[DevicesScreen] Updating hub room via updateHub API');
                const hubApi = HubApi(getApiClient(async () => token));
                const response = await hubApi.updateHub(homeId, deviceId, { roomId });
                console.log('[DevicesScreen] Hub API response:', response);
                const updatedHub = response?.data?.data || response?.data;
                console.log('[DevicesScreen] Hub room updated successfully:', updatedHub);
                console.log('[DevicesScreen] Updated hub roomId:', updatedHub?.room_id || updatedHub?.roomId);
                
                // Verify the update was saved
                if (updatedHub) {
                  const savedRoomId = updatedHub.room_id || updatedHub.roomId;
                  console.log('[DevicesScreen] Saved roomId in backend:', savedRoomId, 'Expected:', roomId);
                  if (String(savedRoomId) !== String(roomId)) {
                    console.warn('[DevicesScreen] WARNING: RoomId mismatch! Backend returned:', savedRoomId, 'but we sent:', roomId);
                  }
                }
              } else {
                console.log('[DevicesScreen] Updating regular device room via updateDevice API');
                // Update regular device room
                const hubApi = HubApi(getApiClient(async () => token));
                const response = await hubApi.updateDevice(homeId, deviceId, { roomId });
                console.log('[DevicesScreen] Device API response:', response);
                const updatedDevice = response?.data?.data?.device || response?.data?.device || response?.data;
                console.log('[DevicesScreen] Device room updated successfully:', updatedDevice);
                console.log('[DevicesScreen] Updated device roomId:', updatedDevice?.room_id || updatedDevice?.roomId);
                
                // Verify the update was saved
                if (updatedDevice) {
                  const savedRoomId = updatedDevice.room_id || updatedDevice.roomId;
                  console.log('[DevicesScreen] Saved roomId in backend:', savedRoomId, 'Expected:', roomId);
                  if (String(savedRoomId) !== String(roomId)) {
                    console.warn('[DevicesScreen] WARNING: RoomId mismatch! Backend returned:', savedRoomId, 'but we sent:', roomId);
                  }
                }
              }
              
              // Force refresh both data sources immediately
              console.log('[DevicesScreen] Refreshing data sources...');
              await Promise.all([refresh(), refreshHubs()]);
              console.log('[DevicesScreen] First refresh complete');
              
              // Wait and refresh again to ensure backend changes are reflected
              await new Promise(resolve => setTimeout(resolve, 1000));
              await Promise.all([refresh(), refreshHubs()]);
              console.log('[DevicesScreen] Second refresh complete - room assignment should be visible now');
            } catch (e: any) {
              console.error('[DevicesScreen] Failed to update device room:', e);
              console.error('[DevicesScreen] Error message:', e.message);
              console.error('[DevicesScreen] Error response:', e.response?.data);
              console.error('[DevicesScreen] Error status:', e.response?.status);
              console.error('[DevicesScreen] Full error:', JSON.stringify(e, null, 2));
              Alert.alert('Error', e.response?.data?.error || e.message || 'Failed to update device room');
            }
          }}
          rooms={rooms}
        />
      )}

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
                Alert.alert('Coming Soon', 'Tuya and eWeLink device integration coming soon!');
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
    </View>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    subHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    subHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    statusCard: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
    },
    statusCardOnline: {
      backgroundColor: colors.success + '15',
      borderColor: colors.success + '30',
    },
    statusCardOffline: {
      backgroundColor: colors.offline + '15',
      borderColor: colors.offline + '30',
      opacity: 0.6,
    },
    title: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    addButtonWrapper: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      ...shadows.neonPrimary,
    },
    addButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    addButtonText: {
      color: 'white',
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    heroContainer: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      height: 180,
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      ...shadows.lg,
    },
    heroImage: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    heroImageStyle: {
      borderRadius: borderRadius.xxl,
    },
    heroGradient: {
      padding: spacing.md,
      justifyContent: 'flex-end',
    },
    heroTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: 'white',
    },
    heroSubtitle: {
      fontSize: fontSize.xs,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 2,
    },
    tabBarWrapper: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: borderRadius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBar: {
      backgroundColor: 'transparent',
      elevation: 0,
      shadowOpacity: 0,
    },
    tab: {
      padding: 0,
    },
    tabButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      minWidth: 110,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonInactive: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    tabText: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      flexWrap: 'nowrap',
      flexShrink: 1,
      textAlign: 'center',
    },
    tabTextActive: {
      color: 'white',
      fontWeight: '600',
      flexWrap: 'nowrap',
      textAlign: 'center',
      fontSize: fontSize.xs,
    },
    tabContent: {
      flex: 1,
    },
    tabScrollContent: {
      padding: spacing.lg,
      paddingBottom: 100,
    },
    deviceSection: {
      marginBottom: spacing.lg,
    },
    deviceSectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    devicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    deviceTileWrapper: {
      width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      color: colors.mutedForeground,
      fontSize: fontSize.sm,
    },
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.md,
    },
    emptyText: {
      color: colors.mutedForeground,
      fontSize: fontSize.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    modalDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
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
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    modalButtonSecondary: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonSecondaryText: {
      color: colors.foreground,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    modalCancelButton: {
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    modalCancelText: {
      color: colors.mutedForeground,
      fontSize: fontSize.md,
      textAlign: 'center',
    },
  });