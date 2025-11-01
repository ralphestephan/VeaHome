import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
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
  Wind 
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { roomsData } from '../constants/rooms';
import Header from '../components/Header';
import DeviceTile from '../components/DeviceTile';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi } from '../services/api';
import { useDeviceControl } from '../hooks/useDeviceControl';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = {
  route: RouteProp<RootStackParamList, 'RoomDetail'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomDetail'>;
};

const roomGif = require('../assets/a4be53e82fc25644b6daf11c9ce10542a9783d99.png');

export default function RoomDetailScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const { user, token } = useAuth();
  const homeId = user?.homeId;
  const [room, setRoom] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleDevice, setValue } = useDeviceControl();

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);

  useEffect(() => {
    loadRoomData();
  }, [roomId, homeId]);

  const loadRoomData = async () => {
    if (!homeId) {
      // Fallback to mock data
      const mockRoom = roomsData[roomId];
      if (mockRoom) {
        setRoom(mockRoom);
        setDevices(mockRoom.devices || []);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [roomRes, devicesRes] = await Promise.all([
        homeApi.getRoom(homeId, roomId).catch(() => ({ data: roomsData[roomId] })),
        homeApi.getRooms(homeId).then(roomsRes => {
          const foundRoom = (roomsRes.data || []).find((r: any) => r.id === roomId);
          return { data: foundRoom?.devices || [] };
        }).catch(() => ({ data: [] })),
      ]);
      setRoom(roomRes.data || roomsData[roomId]);
      setDevices(devicesRes.data || []);
    } catch (e) {
      console.error('Error loading room:', e);
      // Fallback to mock data
      setRoom(roomsData[roomId]);
      setDevices(roomsData[roomId]?.devices || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceToggle = async (device: any) => {
    await toggleDevice(device.id, device.isActive);
    loadRoomData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Loading..." showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Room not found" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Room not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={room.name} showBack />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Room Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Thermometer
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.temperature}°C</Text>
          </View>
          <View style={styles.statPill}>
            <Droplets
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.humidity}%</Text>
          </View>
          <View style={styles.statPill}>
            <Zap
              size={16}
              color={colors.primary}
            />
            <Text style={styles.statText}>{room.power}</Text>
          </View>
        </View>

        {/* Room Image */}
        {room.image && (
          <TouchableOpacity style={styles.roomPreview} activeOpacity={0.9}>
            <ImageBackground
              source={{ uri: room.image }}
              style={styles.roomImage}
              imageStyle={styles.roomImageStyle}
            >
              <LinearGradient
                colors={['transparent', 'rgba(19, 21, 42, 0.95)']}
                style={styles.roomGradient}
              >
                <View style={styles.roomContent}>
                  <View style={styles.roomHeader}>
                    <View>
                      <Text style={styles.currentSceneLabel}>Current Scene</Text>
                      <Text style={styles.roomSceneText}>{room.scene}</Text>
                    </View>
                    <TouchableOpacity style={styles.changeButton}>
                      <Text style={styles.changeButtonText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roomBadges}>
                    <View style={styles.roomBadge}>
                      <Lightbulb size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{room.lights} lights on</Text>
                    </View>
                    <View style={styles.roomBadge}>
                      <Monitor size={12} color="white" />
                      <Text style={styles.roomBadgeText}>{room.devices} devices</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {/* Quick Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Controls</Text>
          <View style={styles.controlsGrid}>
            <TouchableOpacity 
              style={styles.controlCard}
              onPress={() => {
                const lights = devices.filter(d => d.type === 'light');
                lights.forEach(light => handleDeviceToggle(light));
              }}
            >
              <Lightbulb
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>All Lights</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlCard}
              onPress={() => navigation.navigate('Thermostat', { roomId })}
            >
              <Thermometer
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Climate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlCard}
              onPress={() => {
                // Toggle shutters functionality
                console.log('Shutters toggled');
              }}
            >
              <Fan
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Shutters</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlCard}
              onPress={() => {
                const media = devices.filter(d => d.type === 'tv' || d.type === 'speaker');
                media.forEach(device => handleDeviceToggle(device));
              }}
            >
              <Music
                size={24}
                color={colors.primary}
              />
              <Text style={styles.controlText}>Audio</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Devices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Devices in this room</Text>
            <TouchableOpacity>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devicesGrid}>
            {devices.length > 0 ? (
              devices.map((device) => (
                <DeviceTile
                  key={device.id}
                  icon={device.type === 'light' ? 'lightbulb' : device.type === 'thermostat' ? 'thermometer' : device.type === 'tv' ? 'television' : device.type === 'speaker' ? 'speaker' : 'lightbulb'}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No devices in this room</Text>
            )}
          </View>
        </View>

        {/* Climate Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Climate Control</Text>
          <View style={styles.climateCard}>
            <View style={styles.climateHeader}>
              <View style={styles.climateInfo}>
                <Thermometer
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.climateLabel}>Temperature</Text>
              </View>
              <TouchableOpacity style={styles.autoButton}>
                <Text style={styles.autoButtonText}>Auto</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.climateControls}>
              <TouchableOpacity 
                style={styles.climateButton}
                onPress={() => setTargetTemp(Math.max(16, targetTemp - 1))}
              >
                <Snowflake size={20} color="#60A5FA" />
              </TouchableOpacity>
              <View style={styles.climateValue}>
                <Text style={styles.climateTemp}>{room.temperature}°C</Text>
                <Text style={styles.climateTarget}>
                  Target: {devices.find(d => d.type === 'thermostat' || d.type === 'ac')?.value || room.temperature}°C
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.climateButton}
                onPress={() => setTargetTemp(Math.min(30, targetTemp + 1))}
              >
                <Flame size={20} color="#F97316" />
              </TouchableOpacity>
            </View>
            <View style={styles.climateStats}>
              <View style={styles.climateStat}>
                <Droplets size={16} color={colors.primary} />
                <Text style={styles.climateStatLabel}>Humidity</Text>
                <Text style={styles.climateStatValue}>{room.humidity}%</Text>
              </View>
              <View style={styles.climateStat}>
                <Wind size={16} color={colors.primary} />
                <Text style={styles.climateStatLabel}>Air Quality</Text>
                <Text style={styles.climateStatValue}>Good</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Energy Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy Usage</Text>
          <View style={styles.energyCard}>
            <View style={styles.energyHeader}>
              <Text style={styles.energyLabel}>Current Power</Text>
              <View style={styles.trendBadge}>
                <TrendingDown size={12} color={colors.success} />
                <Text style={styles.trendText}>-8%</Text>
              </View>
            </View>
            <Text style={styles.energyValue}>{room.power}</Text>
            <View style={styles.energyBreakdown}>
              <View style={styles.energyItem}>
                <View style={[styles.energyBar, { width: '45%', backgroundColor: colors.primary }]} />
                <Text style={styles.energyItemText}>Lights 45%</Text>
              </View>
              <View style={styles.energyItem}>
                <View style={[styles.energyBar, { width: '55%', backgroundColor: colors.primary }]} />
                <Text style={styles.energyItemText}>Climate 55%</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: colors.foreground,
  },
  roomPreview: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  roomImage: {
    height: 200,
    width: '100%',
  },
  roomImageStyle: {
    borderRadius: borderRadius.xxl,
  },
  roomGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  roomContent: {
    padding: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  currentSceneLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  roomSceneText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  changeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  roomBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  roomBadgeText: {
    fontSize: 10,
    color: 'white',
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
  manageText: {
    fontSize: 11,
    color: colors.primary,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  controlCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlText: {
    fontSize: 9,
    color: colors.foreground,
    textAlign: 'center',
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  climateCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
  },
  climateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  climateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  climateLabel: {
    fontSize: 13,
    color: colors.foreground,
  },
  autoButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  autoButtonText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  climateControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  climateButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  climateValue: {
    alignItems: 'center',
  },
  climateTemp: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.foreground,
  },
  climateTarget: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  climateStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  climateStat: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  climateStatLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 2,
  },
  climateStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  energyCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  energyLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    color: colors.success,
  },
  energyValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  energyBreakdown: {
    gap: spacing.sm,
  },
  energyItem: {
    gap: 4,
  },
  energyBar: {
    height: 8,
    borderRadius: 4,
  },
  energyItemText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
});