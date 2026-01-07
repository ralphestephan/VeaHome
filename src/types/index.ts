export type RootStackParamList = {
  Home: undefined;
  Dashboard: { screen?: keyof BottomTabParamList; params?: Record<string, unknown> } | undefined;
  HubDetail: { hubId: string }; // Show devices controlled by this hub
  HubSetup: { hubType: 'airguard' | 'ir_blaster' };
  DeviceOnboarding: { hubId: string }; // Add device to hub
  BLEDeviceWizard: { homeId: string; hubType?: string };
  RoomDetail: { roomId: string };
  Thermostat: { roomId: string; deviceId?: string };
  Profile: undefined;
  ProfileEdit: undefined;
  MemberEdit: { memberId: string; homeId: string };
  MemberCreate: { homeId: string };
  SceneForm: { sceneId?: string; homeId: string };
  AutomationForm: { automationId?: string; homeId: string };
  ScheduleForm: { scheduleId?: string; homeId: string };
  Schedules: { homeId?: string } | undefined;
  HomeSelector: undefined;
  DeviceGroups: undefined;
  Automations: undefined;
  DeviceHistory: { deviceId: string };
  IRRFDeviceOnboarding: { deviceType: 'ac' | 'dehumidifier' | 'shutters'; airguardDeviceId: string };
  ACControl: { deviceId: string; airguardDeviceId: string };
  ShuttersControl: { deviceId: string; airguardDeviceId: string };
  DehumidifierControl: { deviceId: string; airguardDeviceId: string };
  Settings: undefined;
  Notifications: undefined;
  TuyaIntegration: { homeId?: string };
};

export type BottomTabParamList = {
  Hubs: undefined; // Shows all smart hubs (AirGuard, VeaHub, etc.)
  Energy: undefined;
  DashboardTab: undefined;
  Scenes: undefined;
  SettingsTab: undefined;
};

// Hub = Smart device with processor (can run automations independently)
// Examples: AirGuard, VeaHub, Tuya hubs, eWelink hubs
export interface Hub {
  id: string;
  name: string;
  brand: 'vealive' | 'tuya' | 'ewelink' | 'other';
  hubType: 'airguard' | 'ir_blaster' | 'zigbee' | 'matter' | 'wifi';
  serialNumber: string;
  status: 'online' | 'offline' | 'pending';
  roomId?: string;
  homeId: string;
  wifiSsid?: string;
  wifiConnected?: boolean;
  firmwareVersion?: string;
  lastSeenAt?: string;
  metadata?: Record<string, any>;
  // AirGuard specific
  airQualityData?: {
    temperature: number;
    humidity: number;
    aqi: number;
    pm25: number;
    co2: number;
    tvoc: number;
  };
  devices?: Device[]; // Devices controlled by this hub
}

// Device = Dumb appliance without brain (needs hub to control it)
// Examples: AC, TV, blinds, lights
export interface Device {
  id: string;
  name: string;
  type: 'light' | 'thermostat' | 'tv' | 'ac' | 'blind' | 'shutter' | 'lock' | 'camera' | 'speaker' | 'sensor' | 'fan' | 'airguard' | 'ir_blaster';
  category: 'IR' | 'RF' | 'Relay' | 'Sensor' | 'Zigbee' | 'Matter' | 'WiFi' | 'climate' | 'media' | 'security' | 'lighting' | 'windows';
  isActive: boolean;
  isOnline?: boolean;
  value?: number | string | boolean;
  unit?: string;
  roomId?: string; // Can inherit from hub.roomId
  hubId: string; // Required - all devices need a hub
  signalMappings?: Record<string, unknown>;
  metadata?: Record<string, any>;
  alarmMuted?: boolean;
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
  sceneName?: string;
  power: string;
  airQuality?: number;
  pm25?: number;
  mq2?: number;
  alert?: boolean;
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
}



export interface Scene {
  id: string;
  name: string;
  icon: string;
  schedule?: string;
  isActive: boolean;
  is_active?: boolean; // For API compatibility
  devices?: number;
  description?: string;
  deviceStates?: Record<string, any>;
  device_states?: Record<string, any>; // For API compatibility
  deviceActions?: DeviceAction[];
  deviceTypeRules?: Record<string, any>;
  device_type_rules?: Record<string, any>; // For API compatibility
}