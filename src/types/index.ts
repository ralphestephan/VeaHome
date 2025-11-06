export type RootStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  HubPair: undefined;
  HubSetup: { hubId: string; qrCode: string };
  DeviceOnboarding: { hubId: string };
  RoomDetail: { roomId: string };
  Thermostat: { roomId: string };
  Profile: undefined;
  SceneForm: { sceneId?: string; homeId: string };
  Schedules: undefined;
  HomeSelector: undefined;
  DeviceGroups: undefined;
  Automations: undefined;
  DeviceHistory: { deviceId: string };
};

export type BottomTabParamList = {
  DashboardTab: undefined;
  Devices: undefined;
  Energy: undefined;
  Scenes: undefined;
  Settings: undefined;
};

export interface Device {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'tv' | 'ac' | 'blind' | 'shutter' | 'lock' | 'camera' | 'speaker' | 'sensor';
  category: 'IR' | 'RF' | 'Relay' | 'Sensor' | 'Zigbee' | 'Matter' | 'WiFi';
  isActive: boolean;
  value?: number;
  unit?: string;
  roomId: string;
  hubId?: string;
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

export interface Scene {
  id: string;
  name: string;
  icon: string;
  schedule?: string;
  isActive: boolean;
  devices?: number;
  description?: string;
  deviceStates?: Record<string, any>;
}