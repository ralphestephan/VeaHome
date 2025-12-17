import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import type { Device, Room, Scene } from '../types';

// Saturday demo requirement: start with an empty home
export const initialDemoDevices: Device[] = [];
export const initialDemoRooms: Room[] = [];
export const initialDemoScenes: Scene[] = [];

const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600';

type AddRoomInput = Room | Omit<Room, 'id'>;
type AddDeviceInput = Device | Omit<Device, 'id'>;

interface DemoContextValue {
  devices: Device[];
  rooms: Room[];
  scenes: Scene[];

  toggleDevice: (deviceId: string) => void;
  setDeviceValue: (deviceId: string, value: number) => void;
  setDeviceMuted: (deviceId: string, muted: boolean) => void;
  activateScene: (sceneId: string) => void;

  addRoom: (room: AddRoomInput) => string;
  addDevice: (device: AddDeviceInput) => string;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  getDevicesByRoom: (roomId: string) => Device[];
  getRoomStats: (roomId: string) => {
    activeDevices: number;
    totalDevices: number;
    temperature?: number;
    humidity?: number;
    aqi?: number;
  };
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>(initialDemoDevices);
  const [rooms, setRooms] = useState<Room[]>(initialDemoRooms);
  const [scenes, setScenes] = useState<Scene[]>(initialDemoScenes);

  const toggleDevice = useCallback((deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, isActive: !device.isActive } : device,
      ),
    );
  }, []);

  const setDeviceValue = useCallback((deviceId: string, value: number) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              value,
              isActive: true,
            }
          : device,
      ),
    );
  }, []);

  const setDeviceMuted = useCallback((deviceId: string, muted: boolean) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              alarmMuted: muted,
            }
          : device,
      ),
    );
  }, []);

  const activateScene = useCallback(
    (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) {
        setScenes((prev) => prev.map((s) => ({ ...s, isActive: false })));
        return;
      }

      // apply device actions (if any)
      if (scene.deviceActions?.length) {
        setDevices((prev) => {
          const next = [...prev];
          for (const action of scene.deviceActions || []) {
            const index = next.findIndex((d) => d.id === action.deviceId);
            if (index === -1) continue;
            next[index] = {
              ...next[index],
              isActive: action.action.isActive ?? next[index].isActive,
              value: action.action.value ?? next[index].value,
            };
          }
          return next;
        });
      }

      setScenes((prev) => prev.map((s) => ({ ...s, isActive: s.id === sceneId })));
    },
    [scenes],
  );

  const addRoom = useCallback((room: AddRoomInput) => {
    const nextId = 'id' in room ? room.id : `room_${Date.now()}`;
    const safeRoom: Room = {
      id: nextId,
      name: 'name' in room ? room.name : 'Room',
      temperature: 'temperature' in room ? room.temperature : 22,
      humidity: 'humidity' in room ? room.humidity : 50,
      lights: 'lights' in room ? room.lights : 0,
      devices: [],
      scene: 'scene' in room ? room.scene : '',
      power: 'power' in room ? room.power : '0.0kW',
      airQuality: 'airQuality' in room ? room.airQuality : undefined,
      image: ('image' in room ? room.image : undefined) || DEFAULT_ROOM_IMAGE,
      accentColor: 'accentColor' in room ? room.accentColor : undefined,
      layoutPath: 'layoutPath' in room ? room.layoutPath : undefined,
      layoutOffset: 'layoutOffset' in room ? room.layoutOffset : undefined,
      layout: 'layout' in room ? room.layout : undefined,
      color: 'color' in room ? room.color : undefined,
      model3dUrl: 'model3dUrl' in room ? room.model3dUrl : undefined,
    };

    setRooms((prev) => [...prev, safeRoom]);
    return nextId;
  }, []);

  const addDevice = useCallback((device: AddDeviceInput) => {
    const nextId = 'id' in device ? device.id : `d${Date.now()}`;

    const isAirguard = ('type' in device ? device.type : undefined) === 'airguard';

    const safeDevice: Device = {
      id: nextId,
      name: 'name' in device ? device.name : 'Device',
      type: (device as any).type,
      category: (device as any).category,
      isActive: 'isActive' in device ? device.isActive : true,
      value: 'value' in device ? device.value : undefined,
      unit: 'unit' in device ? device.unit : undefined,
      roomId: (device as any).roomId,
      hubId: 'hubId' in device ? device.hubId : undefined,
      airQualityData:
        'airQualityData' in device
          ? device.airQualityData
          : isAirguard
            ? { temperature: 23.5, humidity: 50, aqi: 42, pm25: 42, mq2: 35 }
            : undefined,
      alarmMuted: 'alarmMuted' in device ? device.alarmMuted : false,
    };

    setDevices((prev) => [...prev, safeDevice]);
    return nextId;
  }, []);

  const updateDevice = useCallback((deviceId: string, updates: Partial<Device>) => {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, ...updates } : d)));
  }, []);

  const getDevicesByRoom = useCallback(
    (roomId: string) => devices.filter((device) => device.roomId === roomId),
    [devices],
  );

  const roomsWithDevices = useMemo<Room[]>(() => {
    return rooms.map((room) => {
      const roomDevices = devices.filter((d) => d.roomId === room.id);
      const airguard = roomDevices.find((d) => d.type === 'airguard' && d.airQualityData);

      return {
        ...room,
        devices: roomDevices,
        lights: roomDevices.filter((d) => d.type === 'light').length,
        temperature: airguard?.airQualityData?.temperature ?? room.temperature,
        humidity: airguard?.airQualityData?.humidity ?? room.humidity,
        airQuality: airguard?.airQualityData?.aqi ?? room.airQuality,
        pm25: airguard?.airQualityData?.pm25 ?? room.pm25,
        mq2: airguard?.airQualityData?.mq2 ?? room.mq2,
      };
    });
  }, [rooms, devices]);

  const getRoomStats = useCallback(
    (roomId: string) => {
      const room = roomsWithDevices.find((r) => r.id === roomId);
      const roomDevices = devices.filter((d) => d.roomId === roomId);
      return {
        activeDevices: roomDevices.filter((d) => d.isActive).length,
        totalDevices: roomDevices.length,
        temperature: room?.temperature,
        humidity: room?.humidity,
        aqi: room?.airQuality,
      };
    },
    [devices, roomsWithDevices],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      devices,
      rooms: roomsWithDevices,
      scenes,
      toggleDevice,
      setDeviceValue,
      setDeviceMuted,
      activateScene,
      addRoom,
      addDevice,
      updateDevice,
      getDevicesByRoom,
      getRoomStats,
    }),
    [
      devices,
      roomsWithDevices,
      scenes,
      toggleDevice,
      setDeviceValue,
      setDeviceMuted,
      activateScene,
      addRoom,
      addDevice,
      updateDevice,
      getDevicesByRoom,
      getRoomStats,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};
