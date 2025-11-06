import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowRight, 
  Zap, 
  TrendingDown, 
  Home as HomeIcon, 
  CheckCircle, 
  Thermometer, 
  TrendingUp, 
  Lightbulb, 
  Fan, 
  Camera, 
  Lock, 
  Clock, 
  BarChart3 
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabParamList, RootStackParamList } from '../types';
import InteractiveFloorPlan from '../components/InteractiveFloorPlan';
import RoomCard from '../components/RoomCard';
import { useAuth } from '../context/AuthContext';
import { useHomeData } from '../hooks/useHomeData';
import { useEnergyData } from '../hooks/useEnergyData';
import { useRealtime } from '../hooks/useRealtime';
import { Room, Device, Home } from '../types';
import { getApiClient, HomeApi } from '../services/api';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'DashboardTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const homeId = user?.homeId;
  const { rooms, devices, loading, refresh } = useHomeData(homeId);
  const { energyData } = useEnergyData(homeId, 'day');
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [home, setHome] = useState<Home | null>(null);

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
  useRealtime({
    onDeviceUpdate: (data) => {
      // Refresh devices when real-time update received
      refresh();
    },
    onEnergyUpdate: () => {
      // Energy data will refresh on next fetch
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      if (homeId) refresh();
    }, [homeId])
  );

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoom(roomId);
    navigation.navigate('RoomDetail', { roomId });
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

  // Calculate stats from real data
  const activeDevicesCount = devices.filter(d => d.isActive).length;
  const avgTemperature = rooms.length > 0 
    ? rooms.reduce((sum, r) => sum + (r.temperature || 0), 0) / rooms.length 
    : 0;
  const todayEnergy = energyData.length > 0
    ? energyData.reduce((sum, e) => sum + (e.total || 0), 0)
    : 0;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Interactive Floor Plan - moved to top */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Home</Text>
          {viewMode === '2d' ? (
            <InteractiveFloorPlan
              onRoomSelect={handleRoomSelect}
              selectedRoom={selectedRoom}
              rooms={rooms}
              onLayoutUpdate={handleLayoutUpdate}
              homeId={homeId}
            />
          ) : (
            <View style={styles.viewModeContainer}>
              <View style={styles.viewModeHeader}>
                <Text style={styles.viewModeTitle}>3D Floor Plan</Text>
                <Text style={styles.viewModeSubtitle}>Coming Soon</Text>
              </View>
              {home?.model3dUrl ? (
                <WebView
                  source={{ uri: home.model3dUrl }}
                  style={styles.model3dWebView}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                />
              ) : (
                <View style={styles.model3dPlaceholder}>
                  <Text style={styles.model3dPlaceholderText}>
                    No 3D model available
                  </Text>
                  <Text style={styles.model3dPlaceholderSubtext}>
                    Add a 3D model URL in your home settings
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === '2d' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('2d')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === '2d' && styles.viewModeButtonTextActive]}>
                2D
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === '3d' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('3d')}
            >
              <Text style={[styles.viewModeButtonText, viewMode === '3d' && styles.viewModeButtonTextActive]}>
                3D
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading home data...</Text>
          </View>
        )}

        {/* Selected Room Preview - clickable */}
        {selectedRoom && rooms.find(r => r.id === selectedRoom) && (
          (() => {
            const room = rooms.find(r => r.id === selectedRoom)!;
            return (
              <TouchableOpacity
                style={styles.roomPreviewContainer}
                onPress={() => navigation.navigate('RoomDetail', { 
                  roomId: selectedRoom
                })}
                activeOpacity={0.8}
              >
                <RoomCard
                  room={room}
                  onPress={() => {}}
                />
                <View style={styles.tapToEnterBadge}>
                  <Text style={styles.tapToEnterText}>Tap to enter room</Text>
                  <ArrowRight size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })()
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Energy')}
          >
            <View style={styles.statHeader}>
              <View style={styles.statIcon}>
                <Zap size={20} color={colors.primary} />
              </View>
              <View style={styles.trendIndicator}>
                <TrendingDown size={12} color="#10b981" />
                <Text style={styles.trendText}>-12%</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{todayEnergy.toFixed(1)} kWh</Text>
            <Text style={styles.statLabel}>Energy Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Devices')}
          >
            <View style={styles.statHeader}>
              <View style={styles.statIcon}>
                <HomeIcon size={20} color={colors.primary} />
              </View>
              <View style={styles.statusIndicator}>
                <CheckCircle size={12} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.statValue}>{activeDevicesCount}</Text>
            <Text style={styles.statLabel}>Active Devices</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statIcon}>
                <Thermometer size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.statValue}>{Math.round(avgTemperature)}°C</Text>
            <Text style={styles.statLabel}>Avg Temperature</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statIcon}>
                <BarChart3 size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.statValue}>287</Text>
            <Text style={styles.statLabel}>Actions Today</Text>
          </View>
        </View>

        {/* Active Devices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Devices</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Devices')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devicesGrid}>
            <View style={[styles.deviceCard, styles.activeDeviceCard]}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIconActive}>
                  <Lightbulb size={20} color="white" />
                </View>
                <View style={styles.statusBadgeActive}>
                  <Text style={styles.statusTextActive}>On</Text>
                </View>
              </View>
              <Text style={styles.deviceNameActive}>Living Room</Text>
              <Text style={styles.deviceDetailActive}>6 lights active</Text>
            </View>

            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIcon}>
                  <Fan size={20} color={colors.primary} />
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Auto</Text>
                </View>
              </View>
              <Text style={styles.deviceName}>Climate</Text>
              <Text style={styles.deviceDetail}>23°C target</Text>
            </View>

            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIcon}>
                  <Camera size={20} color={colors.primary} />
                </View>
                <View style={[styles.statusBadge, styles.statusBadgeGreen]}>
                  <Text style={styles.statusTextGreen}>Active</Text>
                </View>
              </View>
              <Text style={styles.deviceName}>Security</Text>
              <Text style={styles.deviceDetail}>3 cameras</Text>
            </View>

            <View style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIcon}>
                  <Lock size={20} color={colors.primary} />
                </View>
                <View style={[styles.statusBadge, styles.statusBadgeGreen]}>
                  <Text style={styles.statusTextGreen}>Locked</Text>
                </View>
              </View>
              <Text style={styles.deviceName}>Doors</Text>
              <Text style={styles.deviceDetail}>All secured</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Scenes')}
            >
              <View style={styles.quickActionIcon}>
                <Clock size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Evening Scene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Lightbulb size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>All Lights</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Lock size={20} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>Lock All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Energy Overview */}
        <LinearGradient
          colors={[colors.secondary, colors.muted]}
          style={styles.energyCard}
        >
          <View style={styles.energyHeader}>
            <Text style={styles.energyTitle}>Today's Energy</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Energy')}>
              <Text style={styles.viewAllText}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.energyValue}>
            <Text style={styles.energyNumber}>{todayEnergy.toFixed(1)}</Text>
            <Text style={styles.energyUnit}>kWh</Text>
          </View>
          <View style={styles.energyBreakdown}>
            <View style={styles.energyItem}>
              <View style={styles.energyItemHeader}>
                <Text style={styles.energyItemLabel}>Lights</Text>
                <Text style={styles.energyItemPercent}>45%</Text>
              </View>
              <View style={styles.energyBar}>
                <View style={[styles.energyBarFill, { width: '45%' }]} />
              </View>
            </View>
            <View style={styles.energyItem}>
              <View style={styles.energyItemHeader}>
                <Text style={styles.energyItemLabel}>Climate</Text>
                <Text style={styles.energyItemPercent}>55%</Text>
              </View>
              <View style={styles.energyBar}>
                <View style={[styles.energyBarFill, { width: '55%' }]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.notificationsList}>
            <View style={styles.notificationCard}>
              <View style={[styles.notificationIcon, styles.notificationIconGreen]}>
                <CheckCircle size={16} color="#10b981" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>All systems operational</Text>
                <Text style={styles.notificationTime}>2 min ago</Text>
              </View>
            </View>
            <View style={styles.notificationCard}>
              <View style={[styles.notificationIcon, styles.notificationIconBlue]}>
                <BarChart3 size={16} color="#3b82f6" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Evening scene activated</Text>
                <Text style={styles.notificationTime}>15 min ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scheduled */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled</Text>
          <View style={styles.scheduledCard}>
            <View style={styles.scheduledIcon}>
              <Clock size={16} color={colors.primary} />
            </View>
            <View style={styles.scheduledContent}>
              <Text style={styles.scheduledTitle}>Night Mode</Text>
              <Text style={styles.scheduledTime}>10:00 PM</Text>
            </View>
            <View style={styles.scheduledBadge}>
              <Text style={styles.scheduledBadgeText}>Active</Text>
            </View>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
  },
  welcomeCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  welcomeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: '#10b981',
  },
  statusIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  deviceCard: {
    width: '47%',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDeviceCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconActive: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeGreen: {
    backgroundColor: '#10b98120',
  },
  statusText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  statusTextActive: {
    fontSize: 12,
    color: 'white',
  },
  statusTextGreen: {
    fontSize: 12,
    color: '#10b981',
  },
  deviceName: {
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 4,
  },
  deviceNameActive: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  deviceDetail: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deviceDetailActive: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: colors.foreground,
    textAlign: 'center',
  },
  energyCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  energyTitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  energyValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  energyNumber: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.foreground,
  },
  energyUnit: {
    fontSize: 20,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  energyBreakdown: {
    gap: spacing.md,
  },
  energyItem: {
    gap: 4,
  },
  energyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyItemLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  energyItemPercent: {
    fontSize: 12,
    color: colors.foreground,
  },
  energyBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  notificationsList: {
    gap: spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIconGreen: {
    backgroundColor: '#10b98120',
  },
  notificationIconBlue: {
    backgroundColor: '#3b82f620',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 12,
    color: colors.foreground,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  scheduledIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduledContent: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 12,
    color: colors.foreground,
    marginBottom: 2,
  },
  scheduledTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  scheduledBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  scheduledBadgeText: {
    fontSize: 12,
    color: colors.primary,
  },
  roomPreviewContainer: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tapToEnterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  tapToEnterText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
    marginTop: spacing.md,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  viewModeButtonText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  viewModeButtonTextActive: {
    color: 'white',
  },
  viewModeContainer: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 300,
  },
  viewModeHeader: {
    marginBottom: spacing.md,
  },
  viewModeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  viewModeSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  model3dWebView: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.muted,
  },
  model3dPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  model3dPlaceholderText: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  model3dPlaceholderSubtext: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});