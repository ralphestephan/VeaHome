import { Room, Device, EnergyData, Scene } from '../types';

export const mockDevices: Device[] = [
  { id: 'd1', name: 'Main Lights', type: 'light', category: 'Relay', isActive: true, value: 70, unit: '%', roomId: 'salon' },
  { id: 'd2', name: 'Thermostat', type: 'thermostat', category: 'IR', isActive: true, value: 24, unit: '°C', roomId: 'salon' },
  { id: 'd3', name: 'Smart TV', type: 'tv', category: 'IR', isActive: true, roomId: 'salon' },
  { id: 'd4', name: 'AC Unit', type: 'ac', category: 'IR', isActive: true, value: 22, unit: '°C', roomId: 'master' },
  { id: 'd5', name: 'Bedroom Lights', type: 'light', category: 'Relay', isActive: false, roomId: 'master' },
  { id: 'd6', name: 'Window Blinds', type: 'blind', category: 'RF', isActive: true, value: 75, unit: '%', roomId: 'office' },
  { id: 'd7', name: 'Front Door Lock', type: 'lock', category: 'Relay', isActive: true, roomId: 'entrance' },
  { id: 'd8', name: 'Security Camera', type: 'camera', category: 'Sensor', isActive: true, roomId: 'entrance' },
];

export const mockRooms: Room[] = [
  {
    id: 'salon',
    name: 'Salon',
    temperature: 24,
    humidity: 62,
    lights: 6,
    devices: mockDevices.filter(d => d.roomId === 'salon'),
    scene: 'Evening Relax',
    power: '2.3kW',
    airQuality: 95,
    image: 'https://images.unsplash.com/photo-1668816143164-a439b3e687cd?w=400',
  },
  {
    id: 'master',
    name: 'Master Bedroom',
    temperature: 22,
    humidity: 58,
    lights: 2,
    devices: mockDevices.filter(d => d.roomId === 'master'),
    scene: 'Sleep Mode',
    power: '0.8kW',
    airQuality: 92,
    image: 'https://images.unsplash.com/photo-1666841411771-5c115e702410?w=400',
  },
  {
    id: 'office',
    name: 'Office',
    temperature: 23,
    humidity: 55,
    lights: 2,
    devices: mockDevices.filter(d => d.roomId === 'office'),
    scene: 'Work Focus',
    power: '1.5kW',
    airQuality: 90,
    image: 'https://images.unsplash.com/photo-1616594004753-5d4cc030088c?w=400',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    temperature: 23,
    humidity: 65,
    lights: 3,
    devices: [],
    scene: 'Cooking',
    power: '3.2kW',
    airQuality: 88,
    image: 'https://images.unsplash.com/photo-1652961222237-9e2bbca79504?w=400',
  },
];

export const mockEnergyData: EnergyData[] = [
  { time: '12 AM', total: 2.1, lighting: 0.8, climate: 1.0, media: 0.2, security: 0.1 },
  { time: '3 AM', total: 1.8, lighting: 0.5, climate: 1.0, media: 0.2, security: 0.1 },
  { time: '6 AM', total: 3.2, lighting: 1.2, climate: 1.5, media: 0.4, security: 0.1 },
  { time: '9 AM', total: 2.8, lighting: 1.0, climate: 1.3, media: 0.4, security: 0.1 },
  { time: '12 PM', total: 2.5, lighting: 0.9, climate: 1.2, media: 0.3, security: 0.1 },
  { time: '3 PM', total: 2.9, lighting: 1.1, climate: 1.4, media: 0.3, security: 0.1 },
  { time: '6 PM', total: 4.2, lighting: 1.8, climate: 1.8, media: 0.5, security: 0.1 },
  { time: '9 PM', total: 3.8, lighting: 1.6, climate: 1.6, media: 0.5, security: 0.1 },
];

export const mockScenes: Scene[] = [
  { id: 's1', name: 'Morning', icon: 'white-balance-sunny', schedule: '6:00 AM', isActive: true },
  { id: 's2', name: 'Evening Relax', icon: 'weather-sunset', schedule: '6:00 PM', isActive: true },
  { id: 's3', name: 'Night', icon: 'weather-night', schedule: '10:00 PM', isActive: false },
  { id: 's4', name: 'Movie', icon: 'movie', schedule: undefined, isActive: false },
  { id: 's5', name: 'Party', icon: 'party-popper', schedule: undefined, isActive: false },
  { id: 's6', name: 'Away', icon: 'home-export-outline', schedule: undefined, isActive: false },
];