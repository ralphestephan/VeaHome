export interface RoomData {
  id: string;
  name: string;
  image: string;
  scene: string;
  temperature: number;
  humidity: number;
  lights: number;
  devices: number;
  power: string;
  color: string;
  path: string;
  icon: string;
}

export const roomsData: Record<string, RoomData> = {
  salon: {
    id: 'salon',
    name: 'Salon',
    image: 'https://images.unsplash.com/photo-1668816143164-a439b3e687cd?w=1080',
    scene: 'Evening Relax',
    temperature: 24,
    humidity: 62,
    lights: 6,
    devices: 12,
    power: '2.3kW',
    color: '#C4B5F5',
    path: 'M 180 280 L 380 280 L 380 420 L 180 420 Z',
    icon: 'sofa'
  },
  master: {
    id: 'master',
    name: 'Master',
    image: 'https://images.unsplash.com/photo-1666841411771-5c115e702410?w=1080',
    scene: 'Sleep Mode',
    temperature: 22,
    humidity: 58,
    lights: 2,
    devices: 8,
    power: '0.8kW',
    color: '#FFA07A',
    path: 'M 180 20 L 320 20 L 320 120 L 180 120 Z',
    icon: 'bed'
  },
  dudu: {
    id: 'dudu',
    name: 'Dudu',
    image: 'https://images.unsplash.com/photo-1666841411771-5c115e702410?w=1080',
    scene: 'Night Light',
    temperature: 21,
    humidity: 60,
    lights: 1,
    devices: 5,
    power: '0.4kW',
    color: '#FFB6A0',
    path: 'M 180 120 L 320 120 L 320 200 L 180 200 Z',
    icon: 'bed'
  },
  office: {
    id: 'office',
    name: 'Office',
    image: 'https://images.unsplash.com/photo-1616594004753-5d4cc030088c?w=1080',
    scene: 'Work Focus',
    temperature: 23,
    humidity: 55,
    lights: 2,
    devices: 9,
    power: '1.5kW',
    color: '#FFCB8F',
    path: 'M 180 200 L 320 200 L 320 280 L 180 280 Z',
    icon: 'monitor'
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1652961222237-9e2bbca79504?w=1080',
    scene: 'Cooking',
    temperature: 23,
    humidity: 65,
    lights: 3,
    devices: 10,
    power: '3.2kW',
    color: '#FFE5B4',
    path: 'M 60 280 L 120 280 L 120 380 L 60 380 Z',
    icon: 'utensils'
  },
  sitting: {
    id: 'sitting',
    name: 'Sitting',
    image: 'https://images.unsplash.com/photo-1668816143164-a439b3e687cd?w=1080',
    scene: 'Reading',
    temperature: 23,
    humidity: 60,
    lights: 3,
    devices: 6,
    power: '0.9kW',
    color: '#B8A9D8',
    path: 'M 120 280 L 180 280 L 180 380 L 120 380 Z',
    icon: 'sofa'
  },
  wc1: {
    id: 'wc1',
    name: 'WC',
    image: 'https://images.unsplash.com/photo-1723386384578-29f725c16cf1?w=1080',
    scene: 'Comfort',
    temperature: 20,
    humidity: 70,
    lights: 1,
    devices: 3,
    power: '0.3kW',
    color: '#87CEEB',
    path: 'M 60 120 L 120 120 L 120 200 L 60 200 Z',
    icon: 'bath'
  },
  wc2: {
    id: 'wc2',
    name: 'WC',
    image: 'https://images.unsplash.com/photo-1723386384578-29f725c16cf1?w=1080',
    scene: 'Fresh',
    temperature: 20,
    humidity: 72,
    lights: 1,
    devices: 3,
    power: '0.2kW',
    color: '#87CEEB',
    path: 'M 60 200 L 120 200 L 120 280 L 60 280 Z',
    icon: 'bath'
  },
  wc3: {
    id: 'wc3',
    name: 'WC',
    image: 'https://images.unsplash.com/photo-1723386384578-29f725c16cf1?w=1080',
    scene: 'Guest',
    temperature: 19,
    humidity: 68,
    lights: 1,
    devices: 2,
    power: '0.2kW',
    color: '#87CEEB',
    path: 'M 120 380 L 180 380 L 180 440 L 120 440 Z',
    icon: 'bath'
  },
  balcony1: {
    id: 'balcony1',
    name: 'Balcony',
    image: 'https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?w=1080',
    scene: 'Outdoor',
    temperature: 18,
    humidity: 75,
    lights: 1,
    devices: 2,
    power: '0.1kW',
    color: '#FFD4A3',
    path: 'M 320 20 L 420 20 L 420 120 L 320 120 Z',
    icon: 'cloud-sun'
  },
  balcony2: {
    id: 'balcony2',
    name: 'Balcony',
    image: 'https://images.unsplash.com/photo-1751885891345-3f137afbc5ca?w=1080',
    scene: 'Garden',
    temperature: 18,
    humidity: 78,
    lights: 1,
    devices: 2,
    power: '0.1kW',
    color: '#FFE4B5',
    path: 'M 380 420 L 500 420 L 500 500 L 380 500 Z',
    icon: 'cloud-sun'
  },
  plant: {
    id: 'plant',
    name: 'Plant',
    image: '',
    scene: 'Garden',
    temperature: 22,
    humidity: 70,
    lights: 1,
    devices: 1,
    power: '0.05kW',
    color: '#FFB6D4',
    path: 'M 340 380 L 440 380 L 440 480 L 340 480 Z',
    icon: 'flower'
  },
  entrance: {
    id: 'entrance',
    name: 'Entrance',
    image: '',
    scene: 'Welcome',
    temperature: 21,
    humidity: 60,
    lights: 1,
    devices: 3,
    power: '0.2kW',
    color: '#D4D4D4',
    path: 'M 120 440 L 180 440 L 180 500 L 120 500 Z',
    icon: 'door-open'
  },
  lift: {
    id: 'lift',
    name: 'Lift',
    image: '',
    scene: '',
    temperature: 20,
    humidity: 55,
    lights: 1,
    devices: 1,
    power: '0.1kW',
    color: '#B0B0B0',
    path: 'M 60 380 L 120 380 L 120 460 L 60 460 Z',
    icon: 'arrow-up-down'
  }
};