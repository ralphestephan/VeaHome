import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Grid3X3, Zap, Wand2, Settings } from 'lucide-react-native';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DevicesScreen from '../screens/DevicesScreen';
import EnergyScreen from '../screens/EnergyScreen';
import ScenesScreen from '../screens/ScenesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoomDetailScreen from '../screens/RoomDetailScreen';
import ThermostatScreen from '../screens/ThermostatScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import HubPairScreen from '../screens/HubPairScreen';
import HubSetupWizard from '../screens/HubSetupWizard';
import DeviceOnboardingWizard from '../screens/DeviceOnboardingWizard';
import SceneFormScreen from '../screens/SceneFormScreen';
import HomeSelectorScreen from '../screens/HomeSelectorScreen';
import DeviceGroupsScreen from '../screens/DeviceGroupsScreen';
import AutomationsScreen from '../screens/AutomationsScreen';
import DeviceHistoryScreen from '../screens/DeviceHistoryScreen';

import type { RootStackParamList, BottomTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
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
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading, user } = useAuth();

  return (
    <NavigationContainer>
      {loading ? null : token ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={MainTabs} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="HubPair" component={HubPairScreen} />
          <Stack.Screen name="HubSetup" component={HubSetupWizard} />
          <Stack.Screen name="DeviceOnboarding" component={DeviceOnboardingWizard} />
          <Stack.Screen name="SceneForm" component={SceneFormScreen} />
          <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
          <Stack.Screen name="Thermostat" component={ThermostatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Schedules" component={SchedulesScreen} />
          <Stack.Screen name="HomeSelector" component={HomeSelectorScreen} />
          <Stack.Screen name="DeviceGroups" component={DeviceGroupsScreen} />
          <Stack.Screen name="Automations" component={AutomationsScreen} />
          <Stack.Screen name="DeviceHistory" component={DeviceHistoryScreen} />
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