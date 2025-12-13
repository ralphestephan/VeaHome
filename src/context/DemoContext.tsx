import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Device, Scene, Room } from '../types';

// Demo devices with full data
const initialDemoDevices: Device[] = [
  // Living Room / Salon
  { id: 'd1', name: 'Main Light', type: 'light', category: 'Relay', isActive: true, value: 70, unit: '%', roomId: 'salon', hubId: 'hub1' },
  { id: 'd2', name: 'Floor Lamp', type: 'light', category: 'Relay', isActive: false, value: 50, unit: '%', roomId: 'salon', hubId: 'hub1' },
  { id: 'd3', name: 'Desk Lamp', type: 'light', category: 'Relay', isActive: true, value: 80, unit: '%', roomId: 'salon', hubId: 'hub1' },
  { id: 'd4', name: 'Thermostat', type: 'thermostat', category: 'IR', isActive: true, value: 24, unit: '°C', roomId: 'salon', hubId: 'hub1' },
  { id: 'd5', name: 'Smart TV', type: 'tv', category: 'IR', isActive: false, roomId: 'salon', hubId: 'hub1' },
  { id: 'd6', name: 'Shutters', type: 'blind', category: 'RF', isActive: true, value: 100, unit: '%', roomId: 'salon', hubId: 'hub1' },
  
  // Master Bedroom
  { id: 'd7', name: 'Ceiling Light', type: 'light', category: 'Relay', isActive: false, value: 60, unit: '%', roomId: 'master', hubId: 'hub1' },
  { id: 'd8', name: 'Bedside Lamp', type: 'light', category: 'Relay', isActive: true, value: 30, unit: '%', roomId: 'master', hubId: 'hub1' },
  { id: 'd9', name: 'AC Unit', type: 'ac', category: 'IR', isActive: true, value: 22, unit: '°C', roomId: 'master', hubId: 'hub1' },
  { id: 'd10', name: 'Window Blinds', type: 'blind', category: 'RF', isActive: true, value: 50, unit: '%', roomId: 'master', hubId: 'hub1' },
  
  // Office
  { id: 'd11', name: 'Desk Light', type: 'light', category: 'Relay', isActive: true, value: 100, unit: '%', roomId: 'office', hubId: 'hub1' },
  { id: 'd12', name: 'Monitor Backlight', type: 'light', category: 'Relay', isActive: true, value: 40, unit: '%', roomId: 'office', hubId: 'hub1' },
  { id: 'd13', name: 'Office AC', type: 'ac', category: 'IR', isActive: false, value: 23, unit: '°C', roomId: 'office', hubId: 'hub1' },
  
  // Kitchen
  { id: 'd14', name: 'Kitchen Light', type: 'light', category: 'Relay', isActive: true, value: 100, unit: '%', roomId: 'kitchen', hubId: 'hub1' },
  { id: 'd15', name: 'Under Cabinet', type: 'light', category: 'Relay', isActive: false, value: 70, unit: '%', roomId: 'kitchen', hubId: 'hub1' },
  { id: 'd16', name: 'Smart Fridge', type: 'sensor', category: 'Sensor', isActive: true, value: 4, unit: '°C', roomId: 'kitchen', hubId: 'hub1' },
  
  // Entrance
  { id: 'd17', name: 'Front Door Lock', type: 'lock', category: 'Relay', isActive: true, roomId: 'entrance', hubId: 'hub1' },
  { id: 'd18', name: 'Security Cam', type: 'camera', category: 'Sensor', isActive: true, roomId: 'entrance', hubId: 'hub1' },
  { id: 'd19', name: 'Entrance Light', type: 'light', category: 'Relay', isActive: false, value: 100, unit: '%', roomId: 'entrance', hubId: 'hub1' },
  { id: 'd20', name: 'Motion Sensor', type: 'sensor', category: 'Sensor', isActive: true, roomId: 'entrance', hubId: 'hub1' },
  
  // Bathroom
  { id: 'd21', name: 'Bathroom Light', type: 'light', category: 'Relay', isActive: false, value: 100, unit: '%', roomId: 'bathroom', hubId: 'hub1' },
  { id: 'd22', name: 'Exhaust Fan', type: 'fan', category: 'Relay', isActive: false, roomId: 'bathroom', hubId: 'hub1' },
];

// Demo rooms with layout positions
const initialDemoRooms: Room[] = [
  {
    id: 'salon',
    name: 'Living Room',
    temperature: 24,
    humidity: 62,
    lights: 3,
    devices: [],
    scene: 'Evening Relax',
    power: '2.3kW',
    airQuality: 95,
    image: 'https://images.unsplash.com/photo-1668816143164-a439b3e687cd?w=400',
    layout: { x: 0, y: 0, w: 2, h: 2 },
    color: '#4F6EF7',
  },
  {
    id: 'master',
    name: 'Master Bedroom',
    temperature: 22,
    humidity: 58,
    lights: 2,
    devices: [],
    scene: 'Sleep Mode',
    power: '0.8kW',
    airQuality: 92,
    image: 'https://images.unsplash.com/photo-1666841411771-5c115e702410?w=400',
    layout: { x: 2, y: 0, w: 2, h: 1 },
    color: '#B366FF',
  },
  {
    id: 'office',
    name: 'Office',
    temperature: 23,
    humidity: 55,
    lights: 2,
    devices: [],
    scene: 'Work Focus',
    power: '1.5kW',
    airQuality: 90,
    image: 'https://images.unsplash.com/photo-1616594004753-5d4cc030088c?w=400',
    layout: { x: 2, y: 1, w: 2, h: 1 },
    color: '#00C2FF',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    temperature: 23,
    humidity: 65,
    lights: 2,
    devices: [],
    scene: 'Cooking',
    power: '3.2kW',
    airQuality: 88,
    image: 'https://images.unsplash.com/photo-1652961222237-9e2bbca79504?w=400',
    layout: { x: 0, y: 2, w: 2, h: 1 },
    color: '#FFB547',
  },
  {
    id: 'entrance',
    name: 'Entrance',
    temperature: 21,
    humidity: 50,
    lights: 1,
    devices: [],
    scene: 'Welcome',
    power: '0.3kW',
    airQuality: 94,
    layout: { x: 2, y: 2, w: 1, h: 1 },
    color: '#00E5A0',
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    temperature: 25,
    humidity: 70,
    lights: 1,
    devices: [],
    scene: 'Relaxation',
    power: '0.5kW',
    airQuality: 85,
    layout: { x: 3, y: 2, w: 1, h: 1 },
    color: '#00FFF0',
  },
];

// Demo scenes
const initialDemoScenes: Scene[] = [
  { id: 's1', name: 'Morning', icon: 'sunrise', schedule: '6:00 AM', isActive: false, deviceActions: [
    { deviceId: 'd1', action: { isActive: true, value: 100 } },
    { deviceId: 'd14', action: { isActive: true, value: 100 } },
    { deviceId: 'd6', action: { isActive: true, value: 100 } },
  ]},
  { id: 's2', name: 'Evening Relax', icon: 'sunset', schedule: '6:00 PM', isActive: true, deviceActions: [
    { deviceId: 'd1', action: { isActive: true, value: 50 } },
    { deviceId: 'd2', action: { isActive: true, value: 30 } },
    { deviceId: 'd5', action: { isActive: true } },
  ]},
  { id: 's3', name: 'Night Mode', icon: 'moon', schedule: '10:00 PM', isActive: false, deviceActions: [
    { deviceId: 'd1', action: { isActive: false } },
    { deviceId: 'd7', action: { isActive: false } },
    { deviceId: 'd8', action: { isActive: true, value: 20 } },
    { deviceId: 'd17', action: { isActive: true } },
  ]},
  { id: 's4', name: 'Movie Time', icon: 'film', schedule: undefined, isActive: false, deviceActions: [
    { deviceId: 'd1', action: { isActive: true, value: 10 } },
    { deviceId: 'd5', action: { isActive: true } },
    { deviceId: 'd6', action: { isActive: true, value: 0 } },
  ]},
  { id: 's5', name: 'Work Mode', icon: 'briefcase', schedule: '9:00 AM', isActive: false, deviceActions: [
    { deviceId: 'd11', action: { isActive: true, value: 100 } },
    { deviceId: 'd12', action: { isActive: true, value: 60 } },
    { deviceId: 'd13', action: { isActive: true, value: 23 } },
  ]},
  { id: 's6', name: 'Away', icon: 'home', schedule: undefined, isActive: false, deviceActions: [
    { deviceId: 'd1', action: { isActive: false } },
    { deviceId: 'd7', action: { isActive: false } },
    { deviceId: 'd17', action: { isActive: true } },
    { deviceId: 'd18', action: { isActive: true } },
  ]},
  { id: 's7', name: 'Party', icon: 'music', schedule: undefined, isActive: false, deviceActions: [
    { deviceId: 'd1', action: { isActive: true, value: 100 } },
    { deviceId: 'd2', action: { isActive: true, value: 100 } },
    { deviceId: 'd3', action: { isActive: true, value: 100 } },
  ]},
  { id: 's8', name: 'All Off', icon: 'power', schedule: undefined, isActive: false, deviceActions: 
    initialDemoDevices.filter(d => d.type === 'light').map(d => ({ deviceId: d.id, action: { isActive: false } }))
  },
];

interface DemoContextValue {
  devices: Device[];
  rooms: Room[];
  scenes: Scene[];
  toggleDevice: (deviceId: string) => void;
  setDeviceValue: (deviceId: string, value: number) => void;
  activateScene: (sceneId: string) => void;
  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  getDevicesByRoom: (roomId: string) => Device[];
  getRoomStats: (roomId: string) => { activeDevices: number; totalDevices: number; temperature?: number };
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>(initialDemoDevices);
  const [rooms] = useState<Room[]>(initialDemoRooms);
  const [scenes, setScenes] = useState<Scene[]>(initialDemoScenes);

  const toggleDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, isActive: !d.isActive } : d
    ));
  }, []);

  const setDeviceValue = useCallback((deviceId: string, value: number) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, value, isActive: value > 0 } : d
    ));
  }, []);

  const activateScene = useCallback((sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene?.deviceActions) return;

    // Apply all device actions from the scene
    setDevices(prev => {
      const updated = [...prev];
      scene.deviceActions?.forEach(action => {
        const idx = updated.findIndex(d => d.id === action.deviceId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            isActive: action.action.isActive ?? updated[idx].isActive,
            value: action.action.value ?? updated[idx].value,
          };
        }
      });
      return updated;
    });

    // Update scene active states
    setScenes(prev => prev.map(s => ({
      ...s,
      isActive: s.id === sceneId,
    })));
  }, [scenes]);

  const addDevice = useCallback((device: Omit<Device, 'id'>) => {
    const newDevice: Device = {
      ...device,
      id: `d${Date.now()}`,
    };
    setDevices(prev => [...prev, newDevice]);
  }, []);

  const updateDevice = useCallback((deviceId: string, updates: Partial<Device>) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, ...updates } : d
    ));
  }, []);

  const getDevicesByRoom = useCallback((roomId: string) => {
    return devices.filter(d => d.roomId === roomId);
  }, [devices]);

  const getRoomStats = useCallback((roomId: string) => {
    const roomDevices = devices.filter(d => d.roomId === roomId);
    const activeDevices = roomDevices.filter(d => d.isActive).length;
    const thermostat = roomDevices.find(d => d.type === 'thermostat' || d.type === 'ac');
    return {
      activeDevices,
      totalDevices: roomDevices.length,
      temperature: thermostat?.value,
    };
  }, [devices]);

  // Populate rooms with their devices
  const roomsWithDevices = useMemo(() => {
    return rooms.map(room => ({
      ...room,
      devices: devices.filter(d => d.roomId === room.id),
      lights: devices.filter(d => d.roomId === room.id && d.type === 'light').length,
    }));
  }, [rooms, devices]);

  const value: DemoContextValue = {
    devices,
    rooms: roomsWithDevices,
    scenes,
    toggleDevice,
    setDeviceValue,
    activateScene,
    addDevice,
    updateDevice,
    getDevicesByRoom,
    getRoomStats,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};

export { initialDemoDevices, initialDemoRooms, initialDemoScenes };
