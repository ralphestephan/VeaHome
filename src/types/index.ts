export type RootStackParamList = {
  Home: undefined;
  Dashboard: { screen?: keyof BottomTabParamList; params?: Record<string, unknown> } | undefined;
  HubPair: undefined;
  HubSetup: { hubId: string; qrCode: string };
  DeviceOnboarding: { hubId: string };
  RoomDetail: { roomId: string };
  Thermostat: { roomId: string; deviceId?: string };
  Profile: undefined;
  SceneForm: { sceneId?: string; homeId: string };
  Schedules: undefined;
  HomeSelector: undefined;
  DeviceGroups: undefined;
  Automations: undefined;
  DeviceHistory: { deviceId: string };
  Settings: undefined;
  Notifications: undefined;
};

export type BottomTabParamList = {
  Devices: undefined;
  Energy: undefined;
  DashboardTab: undefined;
  Scenes: undefined;
  SettingsTab: undefined;
};

export interface Device {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'tv' | 'ac' | 'blind' | 'shutter' | 'lock' | 'camera' | 'speaker' | 'sensor' | 'fan';
  category: 'IR' | 'RF' | 'Relay' | 'Sensor' | 'Zigbee' | 'Matter' | 'WiFi';
  isActive: boolean;
  value?: number;
  unit?: string;
  roomId: string;
  hubId?: string;
}

export interface RoomLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  id: string;
  name: string;
  temperature: number;
  humidity: number;
  lights: number;
  devices: Device[];
  scene: string;
  power: string;
  airQuality?: number;
  image?: string;
  model3dUrl?: string;
  accentColor?: string;
  layoutPath?: string;
  layoutOffset?: { x: number; y: number };
  layout?: RoomLayout;
  color?: string;
}

export interface Home {
  id: string;
  name: string;
  userId: string;
  rooms: Room[];
  totalDevices: number;
  totalEnergy: number;
  model3dUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  homeId: string;
  plan: string;
}

export interface EnergyData {
  time: string;
  total: number;
  lighting: number;
  climate: number;
  media: number;
  security: number;
}

export interface DeviceAction {
  deviceId: string;
  action: {
    isActive?: boolean;
    value?: number;
  };
}

export interface Scene {
  id: string;
  name: string;
  icon: string;
  schedule?: string;
  isActive: boolean;
  devices?: number;
  description?: string;
  deviceStates?: Record<string, any>;
  deviceActions?: DeviceAction[];
}