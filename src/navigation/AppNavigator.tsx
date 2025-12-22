import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Grid3X3, Zap, Wand2, Settings as SettingsIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DevicesScreen from '../screens/DevicesScreen';
import EnergyScreen from '../screens/EnergyScreen';
import ScenesScreen from '../screens/ScenesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoomDetailScreen from '../screens/RoomDetailScreen';
import ThermostatScreen from '../screens/ThermostatScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import HubPairScreen from '../screens/HubPairScreen';
import HubSetupWizard from '../screens/HubSetupWizard';
import DeviceOnboardingWizard from '../screens/DeviceOnboardingWizard';
import DeviceProvisioningWizard from '../screens/DeviceProvisioningWizard';
import BLEDeviceWizard from '../screens/BLEDeviceWizard';
import SceneFormScreen from '../screens/SceneFormScreen';
import AutomationFormScreen from '../screens/AutomationFormScreen';
import HomeSelectorScreen from '../screens/HomeSelectorScreen';
import HomeMembersScreen from '../screens/HomeMembersScreen';
import DeviceGroupsScreen from '../screens/DeviceGroupsScreen';
import AutomationsScreen from '../screens/AutomationsScreen';
import DeviceHistoryScreen from '../screens/DeviceHistoryScreen';

import type { RootStackParamList, BottomTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      initialRouteName="DashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: 'Devices',
          tabBarIcon: ({ color, size }) => (
            <Grid3X3 size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Energy"
        component={EnergyScreen}
        options={{
          tabBarLabel: 'Energy',
          tabBarIcon: ({ color, size }) => (
            <Zap size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scenes"
        component={ScenesScreen}
        options={{
          tabBarLabel: 'Scenes',
          tabBarIcon: ({ color, size }) => (
            <Wand2 size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading, user } = useAuth();
  const { colors, mode } = useTheme();

  const navigationTheme = useMemo(() => {
    return {
      ...DefaultTheme,
      dark: mode === 'dark',
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.secondary,
        primary: colors.primary,
        text: colors.foreground,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colors, mode]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {loading ? null : token && user ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Dashboard" component={MainTabs} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="HubPair" component={HubPairScreen} />
          <Stack.Screen name="HubSetup" component={HubSetupWizard} />
          <Stack.Screen name="DeviceOnboarding" component={DeviceOnboardingWizard} />
          <Stack.Screen name="DeviceProvisioning" component={DeviceProvisioningWizard} />
          <Stack.Screen name="BLEDeviceWizard" component={BLEDeviceWizard} />
          <Stack.Screen name="SceneForm" component={SceneFormScreen} />
          <Stack.Screen name="AutomationForm" component={AutomationFormScreen} />
          <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
          <Stack.Screen name="Thermostat" component={ThermostatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Schedules" component={SchedulesScreen} />
          <Stack.Screen name="HomeSelector" component={HomeSelectorScreen} />
          <Stack.Screen name="HomeMembers" component={HomeMembersScreen} />
          <Stack.Screen name="DeviceGroups" component={DeviceGroupsScreen} />
          <Stack.Screen name="Automations" component={AutomationsScreen} />
          <Stack.Screen name="DeviceHistory" component={DeviceHistoryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Signup" component={SignupScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}