import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../constants/theme';
import DeviceTileComponent from '../components/DeviceTile';

const smartHomeImage = require('../assets/4239477678dba8bff484942536b80f83ac9c74f8.png');

export default function DevicesScreen() {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lights', title: 'Lights' },
    { key: 'climate', title: 'Climate' },
    { key: 'windows', title: 'Shutters' },
    { key: 'media', title: 'Media' },
    { key: 'security', title: 'Security' },
  ]);

  // Device states
  const [bedroomLight, setBedroomLight] = useState(false);
  const [floorLight, setFloorLight] = useState(true);
  const [mainLight, setMainLight] = useState(true);
  const [deskLamp, setDeskLamp] = useState(false);
  const [kitchenLight1, setKitchenLight1] = useState(true);
  const [kitchenLight2, setKitchenLight2] = useState(true);
  const [bathroomLight, setBathroomLight] = useState(false);
  const [hallwayLight, setHallwayLight] = useState(true);
  const [officeLight, setOfficeLight] = useState(false);
  const [gardenLight, setGardenLight] = useState(false);

  const [livingFan, setLivingFan] = useState(true);
  const [bedroomThermostat, setBedroomThermostat] = useState(false);
  const [kitchenThermostat, setKitchenThermostat] = useState(true);

  const [tvActive, setTvActive] = useState(true);
  const [soundbar, setSoundbar] = useState(true);
  const [speaker, setSpeaker] = useState(false);
  const [bedroomTv, setBedroomTv] = useState(false);

  const LightsRoute = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
      {/* Bedroom */}
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Bedroom</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="lightbulb"
            name="Main Light"
            isActive={bedroomLight}
            onPress={() => setBedroomLight(!bedroomLight)}
          />
          <DeviceTileComponent
            icon="lightbulb-outline"
            name="Floor Lamp"
            value={70}
            unit="%"
            isActive={floorLight}
            onPress={() => setFloorLight(!floorLight)}
          />
        </View>
      </View>

      {/* Living Room */}
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Living Room</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="lightbulb"
            name="Main Lights"
            value={70}
            unit="%"
            isActive={mainLight}
            onPress={() => setMainLight(!mainLight)}
          />
          <DeviceTileComponent
            icon="desk-lamp"
            name="Desk Lamp"
            isActive={deskLamp}
            onPress={() => setDeskLamp(!deskLamp)}
          />
        </View>
      </View>

      {/* Kitchen */}
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Kitchen</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="lightbulb"
            name="Ceiling Light 1"
            isActive={kitchenLight1}
            onPress={() => setKitchenLight1(!kitchenLight1)}
          />
          <DeviceTileComponent
            icon="lightbulb"
            name="Ceiling Light 2"
            isActive={kitchenLight2}
            onPress={() => setKitchenLight2(!kitchenLight2)}
          />
        </View>
      </View>

      {/* Other Areas */}
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Other Areas</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="lightbulb"
            name="Bathroom"
            isActive={bathroomLight}
            onPress={() => setBathroomLight(!bathroomLight)}
          />
          <DeviceTileComponent
            icon="lightbulb"
            name="Hallway"
            isActive={hallwayLight}
            onPress={() => setHallwayLight(!hallwayLight)}
          />
          <DeviceTileComponent
            icon="lightbulb"
            name="Office"
            isActive={officeLight}
            onPress={() => setOfficeLight(!officeLight)}
          />
          <DeviceTileComponent
            icon="outdoor-lamp"
            name="Garden"
            isActive={gardenLight}
            onPress={() => setGardenLight(!gardenLight)}
          />
        </View>
      </View>
    </ScrollView>
  );

  const ClimateRoute = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Climate Control</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="fan"
            name="Living Room"
            value="Medium"
            isActive={livingFan}
            onPress={() => setLivingFan(!livingFan)}
          />
          <DeviceTileComponent
            icon="thermometer"
            name="Bedroom"
            value={22}
            unit="°C"
            isActive={bedroomThermostat}
            onPress={() => setBedroomThermostat(!bedroomThermostat)}
          />
          <DeviceTileComponent
            icon="air-conditioner"
            name="Kitchen AC"
            value={24}
            unit="°C"
            isActive={kitchenThermostat}
            onPress={() => setKitchenThermostat(!kitchenThermostat)}
          />
        </View>
      </View>
    </ScrollView>
  );

  const WindowsRoute = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Window Shutters</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="window-shutter"
            name="Living Room"
            value={75}
            unit="%"
            isActive={true}
          />
          <DeviceTileComponent
            icon="window-shutter"
            name="Bedroom"
            value={50}
            unit="%"
            isActive={false}
          />
        </View>
      </View>
    </ScrollView>
  );

  const MediaRoute = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Entertainment</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="television"
            name="Smart TV"
            isActive={tvActive}
            onPress={() => setTvActive(!tvActive)}
          />
          <DeviceTileComponent
            icon="speaker"
            name="Soundbar"
            value={65}
            unit="%"
            isActive={soundbar}
            onPress={() => setSoundbar(!soundbar)}
          />
          <DeviceTileComponent
            icon="cast"
            name="Smart Speaker"
            isActive={speaker}
            onPress={() => setSpeaker(!speaker)}
          />
          <DeviceTileComponent
            icon="television"
            name="Bedroom TV"
            isActive={bedroomTv}
            onPress={() => setBedroomTv(!bedroomTv)}
          />
        </View>
      </View>
    </ScrollView>
  );

  const SecurityRoute = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabScrollContent}>
      <View style={styles.deviceSection}>
        <Text style={styles.deviceSectionTitle}>Security Devices</Text>
        <View style={styles.devicesGrid}>
          <DeviceTileComponent
            icon="cctv"
            name="Front Door"
            isActive={true}
          />
          <DeviceTileComponent
            icon="lock"
            name="Main Lock"
            isActive={true}
          />
          <DeviceTileComponent
            icon="motion-sensor"
            name="Motion Sensor"
            isActive={true}
          />
          <DeviceTileComponent
            icon="shield"
            name="Alarm System"
            isActive={false}
          />
        </View>
      </View>
    </ScrollView>
  );

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
      renderLabel={({ route, focused }) => (
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Devices</Text>
          <Text style={styles.subtitle}>38 devices connected</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
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
    </SafeAreaView>
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
});