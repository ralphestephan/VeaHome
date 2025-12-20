export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  plan: string;
  created_at: Date;
  updated_at: Date;
}

export interface Home {
  id: string;
  user_id: string;
  owner_id?: string;
  name: string;
  model3d_url?: string;
  layout?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  home_id: string;
  name: string;
  temperature?: number;
  humidity?: number;
  lights?: number;
  power?: string;
  scene?: string;
  air_quality?: number;
  image?: string;
  model3d_url?: string;
  devices?: Device[];
  created_at: Date;
  updated_at: Date;
}

export interface Hub {
  id: string;
  home_id: string;
  serial_number: string;
  name?: string;
  status: string;
  wifi_ssid?: string;
  wifi_connected: boolean;
  mqtt_topic?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  hub_id: string;
  home_id: string;
  room_id: string;
  name: string;
  type: string;
  category: string;
  is_active: boolean;
  value?: number;
  unit?: string;
  signal_mappings?: any;
  created_at: Date;
  updated_at: Date;
}

export interface Scene {
  id: string;
  home_id: string;
  name: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  device_states: any;
  devices?: string[];
  scope?: 'home' | 'rooms';
  room_ids?: string[] | null;
  device_type_rules?: any[];
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  id: string;
  home_id: string;
  name: string;
  time: string;
  days: string[];
  actions: any[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DeviceGroup {
  id: string;
  home_id: string;
  name: string;
  device_ids: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Automation {
  id: string;
  home_id: string;
  name: string;
  trigger: any;
  actions: any[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
