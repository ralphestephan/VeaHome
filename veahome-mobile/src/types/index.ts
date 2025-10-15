export type RootStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  RoomDetail: { roomId: string };
  Thermostat: { roomId: string };
  Profile: undefined;
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
  category: 'IR' | 'RF' | 'Relay' | 'Sensor';
  isActive: boolean;
  value?: number;
  unit?: string;
  roomId: string;
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
}

export interface Home {
  id: string;
  name: string;
  userId: string;
  rooms: Room[];
  totalDevices: number;
  totalEnergy: number;
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
}