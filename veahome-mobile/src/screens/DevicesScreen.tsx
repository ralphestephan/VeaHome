import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../constants/theme';
import DeviceTileComponent from '../components/DeviceTile';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useHomeData } from '../hooks/useHomeData';
import { useHubs } from '../hooks/useHubs';
import { useDeviceControl } from '../hooks/useDeviceControl';
import { useRealtime } from '../hooks/useRealtime';
import { getApiClient, HubApi } from '../services/api';
import type { RootStackParamList } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const smartHomeImage = require('../assets/4239477678dba8bff484942536b80f83ac9c74f8.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DevicesScreen() {
  const layout = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const homeId = user?.homeId;
  const { devices, rooms, loading, refresh } = useHomeData(homeId);
  const { hubs } = useHubs(homeId);
  const { toggleDevice, setValue, loading: deviceLoading } = useDeviceControl();
  const [index, setIndex] = useState(0);

  // Real-time updates
  useRealtime({
    onDeviceUpdate: (data) => {
      refresh();
    },
  });
  const [routes] = useState([
    { key: 'lights', title: 'Lights' },
    { key: 'climate', title: 'Climate' },
    { key: 'windows', title: 'Shutters' },
    { key: 'media', title: 'Media' },
    { key: 'security', title: 'Security' },
  ]);

  // Filter devices by category
  const lightsDevices = devices.filter(d => d.type === 'light');
  const climateDevices = devices.filter(d => d.type === 'thermostat' || d.type === 'ac');
  const windowDevices = devices.filter(d => d.type === 'blind' || d.type === 'shutter');
  const mediaDevices = devices.filter(d => d.type === 'tv' || d.type === 'speaker');
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

  const handleDeviceToggle = async (device: typeof devices[0]) => {
    await toggleDevice(device.id, device.isActive);
    refresh();
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || roomId;
  };

  const getDeviceIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      light: 'lightbulb',
      thermostat: 'thermometer',
      ac: 'thermometer',
      tv: 'television',
      speaker: 'speaker',
      camera: 'camera',
      lock: 'lock',
      blind: 'fan',
      shutter: 'fan',
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
                <DeviceTileComponent
                  key={device.id}
                  icon={getDeviceIcon(device.type)}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
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
                <DeviceTileComponent
                  key={device.id}
                  icon={getDeviceIcon(device.type)}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
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
                <DeviceTileComponent
                  key={device.id}
                  icon={getDeviceIcon(device.type)}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const MediaRoute = () => {
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
                <DeviceTileComponent
                  key={device.id}
                  icon={getDeviceIcon(device.type)}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
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
                <DeviceTileComponent
                  key={device.id}
                  icon={getDeviceIcon(device.type)}
                  name={device.name}
                  value={device.value}
                  unit={device.unit}
                  isActive={device.isActive}
                  onPress={() => handleDeviceToggle(device)}
                />
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
    media: MediaRoute,
    security: SecurityRoute,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: 'transparent' }}
      style={styles.tabBar}
      tabStyle={styles.tab}
      labelStyle={styles.tabLabel}
      activeColor="white"
      inactiveColor={colors.mutedForeground}
      renderLabel={({ route, focused }: { route: any; focused: boolean }) => (
        <View
          style={[
            styles.tabButton,
            focused && styles.tabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              focused && styles.tabTextActive,
            ]}
          >
            {route.title}
          </Text>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Header title="Devices" />
      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>{devices.length} devices connected</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            // Get hubId from existing hubs or devices
            const hubId = hubs.length > 0 
              ? hubs[0].id 
              : devices.find(d => d.hubId)?.hubId 
              || '';
            navigation.navigate('DeviceOnboarding', { hubId });
          }}
        >
          <Text style={styles.addButtonText}>Add Device</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  heroContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    height: 180,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
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
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  tabBar: {
    backgroundColor: colors.secondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 4,
    elevation: 0,
    shadowOpacity: 0,
  },
  tab: {
    padding: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: 'white',
    fontWeight: '600',
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
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
});