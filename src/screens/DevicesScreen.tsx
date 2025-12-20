import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar, SceneMap } from 'react-native-tab-view';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { devices: homeDevices, rooms: homeRooms, loading, refresh, isDemoMode } = useHomeData(homeId);
  const demo = useDemo();
  
  // Use demo data if in demo mode
  const devices: Device[] = isDemoMode ? demo.devices : homeDevices;
  const rooms = isDemoMode ? demo.rooms : homeRooms;
  
  const { hubs } = useHubs(homeId);
  const { toggleDevice, setValue, loading: deviceLoading } = useDeviceControl();
  const [index, setIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Real-time updates
  useRealtime({
    onDeviceUpdate: () => refresh(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);
  const [routes] = useState([
    { key: 'lights', title: 'Lights' },
    { key: 'climate', title: 'Climate' },
    { key: 'windows', title: 'Shutter' },
    { key: 'utility', title: 'Utility' },
    { key: 'security', title: 'Security' },
  ]);

  // Filter devices by category
  const lightsDevices = devices.filter(d => d.type === 'light');
  const climateDevices = devices.filter(d => d.type === 'thermostat' || d.type === 'ac' || d.type === 'airguard');
  const windowDevices = devices.filter(d => d.type === 'blind' || d.type === 'shutter');
  const utilityDevices = devices.filter(d => d.type === 'tv' || d.type === 'speaker');
  const securityDevices = devices.filter(d => d.type === 'camera' || d.type === 'lock');

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
    lights: LightsRoute,
    climate: ClimateRoute,
    windows: WindowsRoute,
    utility: UtilityRoute,
    security: SecurityRoute,
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
        <Text style={styles.subtitle}>{devices.length} devices connected</Text>
        <TouchableOpacity 
          style={styles.addButtonWrapper}
          onPress={() => {
            // Get hubId from existing hubs or devices
            const hubId = hubs.length > 0 
              ? hubs[0].id 
              : devices.find(d => d.hubId)?.hubId 
              || '';
            navigation.navigate('DeviceOnboarding', { hubId });
          }}
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
                    await api.deleteDevice(homeId, deviceId);
                    console.log('[DevicesScreen] Device deleted successfully');
                    
                    // Close modal first
                    setModalVisible(false);
                    setSelectedDevice(null);
                    
                    // Then refresh the device list
                    console.log('[DevicesScreen] Refreshing device list...');
                    await refresh();
                    console.log('[DevicesScreen] Device list refreshed');
                  } catch (e: any) {
                    console.error('[DevicesScreen] Failed to delete device:', e);
                    console.error('[DevicesScreen] Error response:', e.response?.data);
                    Alert.alert('Error', e.response?.data?.error || 'Failed to delete device');
                  }
                },
              },
            ]);
          }}
        />
      )}
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
  });