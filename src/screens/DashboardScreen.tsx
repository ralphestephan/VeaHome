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
  Sparkles,
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
import { useEnergyData } from '../hooks/useEnergyData';
import { useRealtime } from '../hooks/useRealtime';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { useDemo } from '@/context/DemoContext';
import type { Room, Device, Home } from '../types';
import { getApiClient, HomeApi, PublicAirguardApi } from '../services/api';
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
  const homeId = user?.homeId;
  const { rooms: homeRooms, devices: homeDevices, loading, refresh, createRoom, isDemoMode } = useHomeData(homeId);
  const { devices: demoDevices, rooms: demoRooms, toggleDevice: demoToggleDevice, activateScene, addRoom: demoAddRoom, setDeviceMuted } = useDemo();
  
  // Use demo data if in demo mode
  const rooms: Room[] = isDemoMode ? demoRooms : homeRooms;
  const devices: Device[] = isDemoMode ? demoDevices : homeDevices;
  
  const { energyData } = useEnergyData(homeId, 'day');
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [home, setHome] = useState<Home | null>(null);
  const [isFloorPlanEditing, setIsFloorPlanEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const canEditLayout = viewMode === '2d';
  const isEditSession = canEditLayout && isFloorPlanEditing;
  const floorPlanRef = useRef<InteractiveFloorPlanHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const roomPreviewPosition = useRef(0);
  const { controlDevice } = useDeviceControl();
  const [quickActionLoading, setQuickActionLoading] = useState<null | 'lights' | 'locks' | 'scene'>(null);
  const { showToast } = useToast();
  
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
          setHome(response.data);
        } catch (e) {
          console.error('Error loading home:', e);
        }
      }
    };
    loadHome();
  }, [homeId, token]);

  // Real-time updates
  const { isConnected: isCloudConnected } = useRealtime({
    onDeviceUpdate: () => refresh(),
    onEnergyUpdate: () => {},
  });

  useFocusEffect(
    useCallback(() => {
      if (homeId) refresh();
    }, [homeId, refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const scrollToRoomPreview = () => {
    if (!scrollRef.current) return;
    const targetY = Math.max(roomPreviewPosition.current - spacing.xl, 0);
    scrollRef.current.scrollTo({ y: targetY, animated: true });
  };

  const handleRoomSelect = (roomId: string) => {
    userSelectedRoomRef.current = roomId;
    setSelectedRoom(roomId);
    requestAnimationFrame(scrollToRoomPreview);
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
      return await createRoom(room);
    } catch (error) {
      console.error('Room creation error:', error);
      return room;
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
    if (isDemoMode) {
      activateScene('s2'); // Activate "Evening Relax" scene
    }
    setTimeout(() => {
      setQuickActionLoading(null);
      showToast('Evening scene activated', { type: 'success' });
    }, 500);
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

  // Computed values
  const firstName = user?.name?.split(' ')[0] || 'Guest';
  const selectedRoomData = selectedRoom ? rooms.find((room: Room) => room.id === selectedRoom) : null;
  const activeDevicesCount = devices.filter((device: Device) => device.isActive).length;
  const onlineDevicesCount = devices.filter((device: Device) => device.isOnline !== false).length;
  const isHomeOnline = onlineDevicesCount > 0;
  const lightsOnCount = devices.filter((d: Device) => d.type === 'light' && d.isActive).length;
  const totalLights = devices.filter((d: Device) => d.type === 'light').length;
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

  // Track if user explicitly selected a room (to avoid auto-scrolling on data refresh)
  const userSelectedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    // Only scroll if user explicitly selected this room
    if (!selectedRoomData || userSelectedRoomRef.current !== selectedRoom) return;
    const timeout = setTimeout(scrollToRoomPreview, 150);
    userSelectedRoomRef.current = null; // Reset after scrolling
    return () => clearTimeout(timeout);
  }, [selectedRoomData, selectedRoom]);

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
        {/* Hero Welcome Card */}
        <Animated.View style={{ 
          transform: [{ scale: heroScale }], 
          opacity: heroOpacity 
        }}>
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroGlowOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Sparkles size={12} color={colors.neonCyan} />
                  <Text style={styles.heroBadgeText}>VeaHome</Text>
                </View>
                <StatusBadge 
                  variant={isHomeOnline ? 'online' : 'offline'} 
                  size="sm" 
                  label={isHomeOnline ? 'Online' : 'Offline'}
                  pulse={isHomeOnline}
                />
              </View>
              
              <Text style={styles.heroGreeting}>{getGreeting()}, {firstName}</Text>
              <Text style={styles.heroSubtitle}>
                {isHomeOnline 
                  ? (activeDevicesCount > 0 ? 'Your home is running smoothly' : 'All devices are idle')
                  : 'All devices are offline'}
              </Text>
              
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <View style={styles.heroStatIcon}>
                    <HomeIcon size={14} color={colors.neonCyan} />
                  </View>
                  <Text style={styles.heroStatValue}>{rooms.length}</Text>
                  <Text style={styles.heroStatLabel}>Rooms</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <View style={styles.heroStatIcon}>
                    <Lightbulb size={14} color={colors.warning} />
                  </View>
                  <Text style={styles.heroStatValue}>{activeDevicesCount}</Text>
                  <Text style={styles.heroStatLabel}>Active</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <View style={styles.heroStatIcon}>
                    <Zap size={14} color={colors.success} />
                  </View>
                  <Text style={styles.heroStatValue}>{todayEnergy.toFixed(1)}</Text>
                  <Text style={styles.heroStatLabel}>kWh</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Home Status Bar */}
        <View style={styles.section}>
          <HomeStatusBar
            homeName={home?.name || 'My Home'}
            isOnline={isHomeOnline}
            hubCount={1}
            deviceCount={devices.length}
            activeDeviceCount={onlineDevicesCount}
            onHomeSelect={() => navigation.navigate('HomeSelector')}
          />
        </View>

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
          
          <Animated.View style={[styles.viewModeWrapper, { opacity: viewContentFade }]}>
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
          </Animated.View>

          {/* Selected Room Preview */}
          {selectedRoomData && (
            <AnimatedPressable
              onPress={() => navigation.navigate('RoomDetail', { roomId: selectedRoomData.id })}
              style={styles.roomPreviewTouchable}
              onLayout={(event: { nativeEvent: { layout: { y: number } } }) => {
                roomPreviewPosition.current = event.nativeEvent.layout.y;
              }}
            >
              <NeonCard glow="primary" style={styles.roomPreviewCard}>
                <RoomCard
                  room={selectedRoomData}
                  onPress={() => navigation.navigate('RoomDetail', { roomId: selectedRoomData.id })}
                />
                <View style={styles.tapToEnterBadge}>
                  <Text style={styles.tapToEnterText}>Tap to enter room</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </NeonCard>
            </AnimatedPressable>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader 
            title="Quick Actions" 
            action={{ label: 'All Scenes', onPress: () => navigation.navigate('Scenes') }}
          />
          <View style={styles.quickActionsGrid}>
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Moon}
                label="Evening Mode"
                sublabel="5 devices"
                variant="default"
                onPress={handleSceneActivate}
                loading={quickActionLoading === 'scene'}
              />
            </View>
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Lightbulb}
                label={lightsOnCount > 0 ? 'Lights Off' : 'Lights On'}
                sublabel={`${lightsOnCount}/${totalLights} on`}
                variant={lightsOnCount > 0 ? 'warning' : 'default'}
                onPress={handleToggleAllLights}
                loading={quickActionLoading === 'lights'}
                isActive={lightsOnCount > 0}
              />
            </View>
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Lock}
                label="Lock All"
                sublabel="2 locks"
                variant="default"
                onPress={handleLockAllDoors}
                loading={quickActionLoading === 'locks'}
              />
            </View>
            <View style={styles.quickActionItem}>
              <QuickAction
                icon={Shield}
                label="Arm Away"
                sublabel="Security"
                variant="default"
                onPress={() => showToast('Security mode coming soon', { type: 'info' })}
              />
            </View>
          </View>
        </View>

        {/* Favorite Devices */}
        {favoriteDevices.length > 0 && (
          <View style={styles.section}>
            <SectionHeader 
              title="Active Devices" 
              action={{ label: 'All Devices', onPress: () => navigation.navigate('Devices') }}
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
          <NeonCard style={styles.scheduleCard}>
            <View style={styles.scheduleItem}>
              <View style={styles.scheduleIcon}>
                <Clock size={18} color={colors.primary} />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>Night Mode</Text>
                <Text style={styles.scheduleTime}>Today at 10:00 PM</Text>
              </View>
              <View style={styles.scheduleBadge}>
                <Text style={styles.scheduleBadgeText}>Active</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleItem}>
              <View style={[styles.scheduleIcon, { backgroundColor: colors.warning + '20' }]}>
                <Sun size={18} color={colors.warning} />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>Morning Routine</Text>
                <Text style={styles.scheduleTime}>Tomorrow at 7:00 AM</Text>
              </View>
            </View>
          </NeonCard>
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

    // Hero Card
    heroCard: {
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      ...shadows.glow,
    },
    heroGlowOverlay: {
      position: 'absolute',
      top: -50,
      right: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.neonCyan,
      opacity: 0.1,
    },
    heroContent: {
      padding: spacing.lg,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: borderRadius.lg,
    },
    heroBadgeText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.neonCyan,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroGreeting: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: '#FFFFFF',
      marginBottom: spacing.xs,
    },
    heroSubtitle: {
      fontSize: fontSize.md,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: spacing.lg,
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      borderRadius: borderRadius.xl,
      padding: spacing.md,
    },
    heroStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    heroStatIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    heroStatValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: '#FFFFFF',
    },
    heroStatLabel: {
      fontSize: fontSize.xs,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    heroStatDivider: {
      width: 1,
      height: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },

    // Quick Actions
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    quickActionItem: {
      width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
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
  });
};