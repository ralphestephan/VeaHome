import { useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi, HubApi, PublicAirguardApi } from '../services/api';
import { Room, Device } from '../types';
import { initialDemoDevices, initialDemoRooms } from '../context/DemoContext';

export const useHomeData = (homeId: string | null | undefined) => {
  const { token, currentHomeId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode = !token || token === 'DEMO_TOKEN';

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);
  const hubApi = HubApi(client);
  const publicAirguardApi = PublicAirguardApi(client);

  const devicesRef = useRef<Device[]>([]);
  const roomsRef = useRef<Room[]>([]);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const unwrap = <T,>(payload: any, key?: string): T => {
    // Supports both backend shapes:
    // 1) { success:true, data:{ rooms/devices/... } }
    // 2) raw arrays/objects
    if (!payload) return (key ? ([] as any) : (undefined as any));
    const root = payload?.data?.data ?? payload?.data ?? payload;
    if (key) return (root?.[key] ?? root ?? []) as T;
    return root as T;
  };

  const mapDevice = (raw: any): Device => {
    if (!raw) {
      return {
        id: '',
        name: '',
        type: 'sensor',
        category: 'Sensor',
        isActive: false,
        roomId: '',
      };
    }

    const signalMappings = raw.signalMappings ?? raw.signal_mappings;

    return {
      id: String(raw.id),
      name: raw.name,
      type: raw.type,
      category: raw.category,
      isActive: raw.isActive ?? raw.is_active ?? false,
      value: raw.value ?? undefined,
      unit: raw.unit ?? undefined,
      roomId: raw.roomId ?? raw.room_id,
      hubId: raw.hubId ?? raw.hub_id,
      signalMappings: signalMappings && typeof signalMappings === 'object' ? signalMappings : undefined,
      airQualityData: raw.airQualityData,
      alarmMuted: raw.alarmMuted,
    } as Device;
  };

  const mapRoom = (raw: any): Room => {
    return {
      id: String(raw.id),
      name: raw.name,
      temperature: raw.temperature ?? 0,
      humidity: raw.humidity ?? 0,
      lights: raw.lights ?? 0,
      devices: [],
      scene: raw.scene ?? '',
      power: raw.power ?? '0W',
      airQuality: raw.airQuality ?? raw.air_quality,
      pm25: raw.pm25,
      mq2: raw.mq2,
      image: raw.image,
      model3dUrl: raw.model3dUrl ?? raw.model3d_url,
      accentColor: raw.accentColor ?? raw.accent_color,
      layoutPath: raw.layoutPath ?? raw.layout_path,
      layoutOffset: raw.layoutOffset,
      layout: raw.layout,
      color: raw.color,
    };
  };

  const enrichAirguards = async (baseDevices: Device[]): Promise<Device[]> => {
    const airguards = baseDevices.filter((d) => d.type === 'airguard');
    if (!airguards.length) return baseDevices;

    const enriched = await Promise.all(
      baseDevices.map(async (d) => {
        if (d.type !== 'airguard') return d;

        const smartMonitorId =
          (d.signalMappings as any)?.smartMonitorId ??
          (d.signalMappings as any)?.smartmonitorId ??
          1;

        try {
          const res = await publicAirguardApi.getLatest(smartMonitorId);
          const latest = unwrap<any>(res, 'data');
          if (!latest) return d;

          const buzzerEnabled = !!latest.buzzerEnabled;
          return {
            ...d,
            airQualityData:
              typeof latest.temperature === 'number' &&
              typeof latest.humidity === 'number' &&
              typeof latest.aqi === 'number'
                ? {
                    temperature: latest.temperature,
                    humidity: latest.humidity,
                    aqi: latest.aqi,
                    pm25:
                      typeof latest.pm25 === 'number'
                        ? latest.pm25
                        : typeof latest.dust === 'number'
                          ? latest.dust
                          : undefined,
                    mq2: typeof latest.mq2 === 'number' ? latest.mq2 : undefined,
                  }
                : d.airQualityData,
            alarmMuted: !buzzerEnabled,
          };
        } catch {
          return d;
        }
      }),
    );

    return enriched;
  };

  const applyDevicesToRooms = (baseRooms: Room[], baseDevices: Device[]): Room[] => {
    return baseRooms.map((room) => {
      const roomDevices = baseDevices.filter((d) => d.roomId === room.id);
      const airguard = roomDevices.find((d) => d.type === 'airguard' && d.airQualityData);
      return {
        ...room,
        devices: roomDevices,
        temperature: airguard?.airQualityData?.temperature ?? room.temperature,
        humidity: airguard?.airQualityData?.humidity ?? room.humidity,
        airQuality: airguard?.airQualityData?.aqi ?? room.airQuality,
        pm25: airguard?.airQualityData?.pm25 ?? room.pm25,
        mq2: airguard?.airQualityData?.mq2 ?? room.mq2,
        lights: roomDevices.filter((d) => d.type === 'light').length,
      };
    });
  };

  useEffect(() => {
    const effectiveHomeId = homeId || currentHomeId;

    if (isDemoMode) {
      setLoading(true);
      setRooms(initialDemoRooms);
      setDevices(initialDemoDevices);
      setError(null);
      setLoading(false);
      return;
    }

    if (!effectiveHomeId || !token) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const net = await NetInfo.fetch();
        if (net.isConnected) {
          const [roomsRes, devicesRes] = await Promise.all([
            homeApi.getRooms(effectiveHomeId).catch(() => ({ data: [] })),
            hubApi.listDevices(effectiveHomeId).catch(() => ({ data: [] })),
          ]);

          const rawRooms = unwrap<any[]>(roomsRes, 'rooms');
          const rawDevices = unwrap<any[]>(devicesRes, 'devices');

          const mappedRooms = (rawRooms || []).map(mapRoom);
          const mappedDevices = (rawDevices || []).map(mapDevice);
          const enrichedDevices = await enrichAirguards(mappedDevices);
          const roomsWithDevices = applyDevicesToRooms(mappedRooms, enrichedDevices);

          setRooms(roomsWithDevices);
          setDevices(enrichedDevices);

          await AsyncStorage.setItem(`rooms_cache_${effectiveHomeId}`, JSON.stringify(roomsWithDevices));
          await AsyncStorage.setItem(`devices_cache_${effectiveHomeId}`, JSON.stringify(enrichedDevices));
        } else {
          const [roomsCache, devicesCache] = await Promise.all([
            AsyncStorage.getItem(`rooms_cache_${effectiveHomeId}`),
            AsyncStorage.getItem(`devices_cache_${effectiveHomeId}`),
          ]);
          setRooms(roomsCache ? JSON.parse(roomsCache) : []);
          setDevices(devicesCache ? JSON.parse(devicesCache) : []);
          setError('Offline mode');
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load home data');
        console.error('Error loading home data:', e);
        const [roomsCache, devicesCache] = await Promise.all([
          AsyncStorage.getItem(`rooms_cache_${effectiveHomeId}`),
          AsyncStorage.getItem(`devices_cache_${effectiveHomeId}`),
        ]);
        if (roomsCache || devicesCache) {
          setRooms(roomsCache ? JSON.parse(roomsCache) : []);
          setDevices(devicesCache ? JSON.parse(devicesCache) : []);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [homeId, currentHomeId, token, isDemoMode]);

  // Poll Airguard telemetry in real mode to keep values fresh
  useEffect(() => {
    const effectiveHomeId = homeId || currentHomeId;
    if (isDemoMode) return;
    if (!effectiveHomeId || !token) return;

    const interval = setInterval(async () => {
      try {
        const enrichedDevices = await enrichAirguards(devicesRef.current);
        setDevices(enrichedDevices);
        setRooms(applyDevicesToRooms(roomsRef.current, enrichedDevices));
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [homeId, currentHomeId, token, isDemoMode]);

  const refresh = async () => {
    const effectiveHomeId = homeId || currentHomeId;
    if (isDemoMode) {
      setRooms(initialDemoRooms);
      setDevices(initialDemoDevices);
      return;
    }
    if (!effectiveHomeId || !token) return;
    try {
      const [roomsRes, devicesRes] = await Promise.all([
        homeApi.getRooms(effectiveHomeId),
        hubApi.listDevices(effectiveHomeId),
      ]);
      const rawRooms = unwrap<any[]>(roomsRes, 'rooms');
      const rawDevices = unwrap<any[]>(devicesRes, 'devices');

      const mappedRooms = (rawRooms || []).map(mapRoom);
      const mappedDevices = (rawDevices || []).map(mapDevice);
      const enrichedDevices = await enrichAirguards(mappedDevices);
      const roomsWithDevices = applyDevicesToRooms(mappedRooms, enrichedDevices);

      setRooms(roomsWithDevices);
      setDevices(enrichedDevices);
      await AsyncStorage.setItem(`rooms_cache_${effectiveHomeId}`, JSON.stringify(roomsWithDevices));
      await AsyncStorage.setItem(`devices_cache_${effectiveHomeId}`, JSON.stringify(enrichedDevices));
    } catch (e) {
      console.error('Error refreshing data:', e);
    }
  };

  const createRoom = async (room: Room) => {
    if (isDemoMode) {
      // Room creation in demo is handled via DemoContext (DashboardScreen)
      setRooms((prev) => [...prev, room]);
      return;
    }

    // TODO: POST to backend when rooms endpoint is available
    setRooms((prev) => [...prev, room]);
    console.warn('Room creation API not yet available. Showing temporary room locally.');
  };

  return { rooms, devices, loading, error, refresh, createRoom, isDemoMode };
};

