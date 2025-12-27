import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi, HubApi, PublicAirguardApi, ScenesApi } from '../services/api';
import { Room, Device } from '../types';
import { initialDemoDevices, initialDemoRooms } from '../context/DemoContext';

const unwrap = <T,>(payload: any, key?: string): T => {
  // Supports backend shapes:
  // 1) { success:true, data:{ ... } }
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

const mapRoom = (raw: any, sceneNameMap?: Map<string, string>): Room => {
  // Handle corrupted scene field - might be object instead of UUID
  let sceneId = '';
  let sceneName = undefined;
  
  if (raw.scene) {
    if (typeof raw.scene === 'object' && raw.scene.id) {
      // Corrupted: scene field contains full scene object
      sceneId = String(raw.scene.id);
      sceneName = raw.scene.name || undefined;
      console.log('[mapRoom] Corrupted scene field detected:', { sceneId, sceneName });
    } else if (typeof raw.scene === 'string') {
      // Correct: scene field contains UUID
      sceneId = raw.scene;
      sceneName = sceneNameMap ? sceneNameMap.get(String(sceneId)) : undefined;
    }
  }
  
  return {
    id: String(raw.id),
    name: raw.name,
    // Don't default to 0 - leave undefined if no data
    temperature: raw.temperature,
    humidity: raw.humidity,
    lights: raw.lights ?? 0,
    devices: [],
    scene: sceneId,
    sceneName: sceneName,
    power: raw.power,
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

const applyDevicesToRooms = (baseRooms: Room[], baseDevices: Device[]): Room[] => {
  return baseRooms.map((room) => {
    // Use String() comparison to handle type mismatches (UUID strings)
    const roomDevices = baseDevices.filter((d) => String(d.roomId) === String(room.id));
    
    // Find AirGuard device (even if offline, it should still be in the list)
    // Don't require airQualityData to exist - device might be offline
    const airguard = roomDevices.find((d) => d.type === 'airguard');
    
    // Debug logging for room device assignment
    if (roomDevices.length > 0) {
      console.log('[applyDevicesToRooms] Room:', room.name, 'has', roomDevices.length, 'devices:', roomDevices.map(d => ({ id: d.id, name: d.name, type: d.type, roomId: d.roomId, hasAirQualityData: !!d.airQualityData })));
    } else {
      console.log('[applyDevicesToRooms] Room:', room.name, 'has NO devices. All devices:', baseDevices.map(d => ({ id: d.id, name: d.name, roomId: d.roomId })));
    }
    
    // Use room power from backend, default to '0W' if not provided
    const roomPower = room.power || '0W';
    
    // Get stats from AirGuard if available (even if offline, we might have cached data)
    const airguardData = airguard?.airQualityData;
    
    return {
      ...room,
      devices: roomDevices, // Always include devices array, even if empty
      temperature: airguardData?.temperature ?? room.temperature,
      humidity: airguardData?.humidity ?? room.humidity,
      airQuality: airguardData?.aqi ?? room.airQuality,
      pm25: airguardData?.pm25 ?? room.pm25,
      mq2: airguardData?.mq2 ?? room.mq2,
      alert: airguardData?.alert ?? room.alert,
      alertFlags: airguardData?.alertFlags ?? room.alertFlags,
      lights: roomDevices.filter((d) => d.type === 'light').length,
      power: roomPower,
    };
  });
};

export const useHomeData = (homeId: string | null | undefined) => {
  const { token, currentHomeId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode = token === 'DEMO_TOKEN';

  const client = useMemo(() => getApiClient(async () => token), [token]);
  const homeApi = useMemo(() => HomeApi(client), [client]);
  const hubApi = useMemo(() => HubApi(client), [client]);
  const publicAirguardApi = useMemo(() => PublicAirguardApi(client), [client]);
  const scenesApi = useMemo(() => ScenesApi(client), [client]);

  const devicesRef = useRef<Device[]>([]);
  const roomsRef = useRef<Room[]>([]);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const enrichAirguards = useCallback(async (baseDevices: Device[]): Promise<Device[]> => {
    const airguards = baseDevices.filter((d) => d.type === 'airguard');
    if (!airguards.length) {
      // No airguards to enrich - silent return
      return baseDevices;
    }

    console.log('[enrichAirguards] Enriching', airguards.length, 'airguard device(s)');

    const fetchLatest = async (smartMonitorId: number | string) => {
      // Use a shorter timeout so a slow Influx/Node-RED path doesn't stall the whole home refresh.
      const res = await client.get(`/public/airguard/${smartMonitorId}/latest`, { timeout: 4000 });
      return unwrap<any>(res, 'data');
    };

    const fetchStatus = async (smartMonitorId: number | string) => {
      const res = await client.get(`/public/airguard/${smartMonitorId}/status`, { timeout: 4000 });
      return unwrap<any>(res, 'data');
    };

    const enriched = await Promise.all(
      baseDevices.map(async (d) => {
        if (d.type !== 'airguard') return d;

        const smartMonitorId =
          (d.signalMappings as any)?.smartMonitorId ??
          (d.signalMappings as any)?.smartmonitorId ??
          1;

        try {
          const [latest, status] = await Promise.all([
            fetchLatest(smartMonitorId).catch(() => null),
            fetchStatus(smartMonitorId).catch(() => null),
          ]);

          // Determine online status - default to offline if no status data
          const isOnline = status?.online ?? false;

          if (!latest) {
            return { ...d, isOnline };
          }

          const toNum = (v: any): number | undefined => {
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string') {
              const n = Number(v);
              return Number.isFinite(n) ? n : undefined;
            }
            return undefined;
          };

          const temperature = toNum(latest.temperature);
          const humidity = toNum(latest.humidity);
          const aqi = toNum(latest.aqi);
          const pm25 = toNum(latest.pm25 ?? latest.dust);
          const dust = toNum(latest.dust);
          const mq2 = toNum(latest.mq2);
          const alert = !!latest.alert;

          const buzzerEnabled = !!latest.buzzerEnabled;

          // Set airQualityData if we have ANY sensor data
          const hasAnyData = temperature !== undefined || humidity !== undefined || 
                             aqi !== undefined || dust !== undefined || mq2 !== undefined;

          return {
            ...d,
            isOnline,
            isActive: isOnline,
            airQualityData: hasAnyData
              ? {
                  temperature: temperature ?? 0,
                  humidity: humidity ?? 0,
                  aqi: aqi ?? dust ?? 0,
                  pm25: pm25 ?? dust,
                  dust,
                  mq2,
                  alert,
                }
              : d.airQualityData,
            alarmMuted: !buzzerEnabled,
          };
        } catch {
          return { ...d, isOnline: false };
        }
      }),
    );

    return enriched;
  }, [client]);

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
          const [roomsRes, devicesRes, hubsRes, scenesRes] = await Promise.all([
            homeApi.getRooms(effectiveHomeId).catch(() => ({ data: [] })),
            hubApi.listDevices(effectiveHomeId).catch(() => ({ data: [] })),
            hubApi.listHubs(effectiveHomeId).catch(() => ({ data: [] })),
            scenesApi.listScenes(effectiveHomeId).catch(() => ({ data: [] })),
          ]);

          const rawRooms = unwrap<any[]>(roomsRes, 'rooms');
          const rawDevices = unwrap<any[]>(devicesRes, 'devices');
          const rawHubs = unwrap<any[]>(hubsRes, 'hubs');
          const rawScenes = unwrap<any[]>(scenesRes, 'scenes');

          // Build scene ID -> name map
          const sceneNameMap = new Map<string, string>();
          (rawScenes || []).forEach((scene: any) => {
            if (scene.id && scene.name) {
              sceneNameMap.set(String(scene.id), scene.name);
            }
          });
          console.log('[useHomeData] Scene name map:', Array.from(sceneNameMap.entries()));
          console.log('[useHomeData] Raw rooms before mapping:', rawRooms.map((r: any) => ({ id: r.id, name: r.name, scene: r.scene })));

          const mappedRooms = (rawRooms || []).map((r: any) => mapRoom(r, sceneNameMap));
          console.log('[useHomeData] Mapped rooms:', mappedRooms.map(r => ({ id: r.id, name: r.name, scene: r.scene, sceneName: r.sceneName })));
          const mappedDevices = (rawDevices || []).map(mapDevice);
          
          // Map hubs to device format and include them in the device list
          const mappedHubDevices = (rawHubs || []).map((h: any) => {
            const roomId = h.roomId || h.room_id || null;
            console.log('[useHomeData] Mapping hub to device:', { 
              hubId: h.id, 
              hubName: h.name, 
              roomId, 
              roomIdRaw: h.roomId, 
              room_idRaw: h.room_id,
              fullHub: h 
            });
            return {
              id: String(h.id),
              name: h.name,
              type: h.hubType || h.hub_type || 'airguard',
              category: 'climate' as const,
              isActive: h.status === 'online',
              value: undefined,
              unit: undefined,
              roomId: roomId ? String(roomId) : '',
              hubId: h.id,
              homeId: h.homeId || h.home_id,
              status: h.status || 'offline',
              hubType: h.hubType || h.hub_type,
              serialNumber: h.serialNumber || h.serial_number,
              metadata: h.metadata,
              airQualityData: h.airQualityData,
            } as Device;
          });
          
          // Combine regular devices and hub devices
          const allDevices = [...mappedDevices, ...mappedHubDevices];
          const enrichedDevices = await enrichAirguards(allDevices);
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
    }, 2000); // Poll every 2 seconds for faster updates

    return () => clearInterval(interval);
  }, [homeId, currentHomeId, token, isDemoMode]);

  const refresh = useCallback(async () => {
    const effectiveHomeId = homeId || currentHomeId;
    if (isDemoMode) {
      setRooms(initialDemoRooms);
      setDevices(initialDemoDevices);
      return;
    }
    if (!effectiveHomeId || !token) return;
    try {
      console.log('[useHomeData.refresh] Starting refresh...');
      const [roomsRes, devicesRes, hubsRes] = await Promise.all([
        homeApi.getRooms(effectiveHomeId).catch(() => ({ data: [] })),
        hubApi.listDevices(effectiveHomeId).catch(() => ({ data: [] })),
        hubApi.listHubs(effectiveHomeId).catch(() => ({ data: [] })), // CRITICAL: Include hubs in refresh!
      ]);
      
      const rawRooms = unwrap<any[]>(roomsRes, 'rooms');
      const rawDevices = unwrap<any[]>(devicesRes, 'devices');
      const rawHubs = unwrap<any[]>(hubsRes, 'hubs');

      console.log('[useHomeData.refresh] Fetched:', {
        rooms: rawRooms?.length || 0,
        devices: rawDevices?.length || 0,
        hubs: rawHubs?.length || 0,
      });

      const mappedRooms = (rawRooms || []).map(mapRoom);
      const mappedDevices = (rawDevices || []).map(mapDevice);
      
      // Map hubs to device format and include them in the device list (same as loadData)
      const mappedHubDevices = (rawHubs || []).map((h: any) => {
        const roomId = h.roomId || h.room_id || null;
        return {
          id: String(h.id),
          name: h.name,
          type: h.hubType || h.hub_type || 'airguard',
          category: 'climate' as const,
          isActive: h.status === 'online',
          value: undefined,
          unit: undefined,
          roomId: roomId ? String(roomId) : '',
          hubId: h.id,
          homeId: h.homeId || h.home_id,
          status: h.status || 'offline',
          hubType: h.hubType || h.hub_type,
          serialNumber: h.serialNumber || h.serial_number,
          metadata: h.metadata,
          airQualityData: h.airQualityData,
        } as Device;
      });

      // Combine regular devices and hub devices
      const allDevices = [...mappedDevices, ...mappedHubDevices];
      const enrichedDevices = await enrichAirguards(allDevices);
      const roomsWithDevices = applyDevicesToRooms(mappedRooms, enrichedDevices);

      console.log('[useHomeData.refresh] After enrichment:', {
        totalDevices: enrichedDevices.length,
        roomsWithDevices: roomsWithDevices.map(r => ({ name: r.name, deviceCount: r.devices?.length || 0 })),
      });

      setRooms(roomsWithDevices);
      setDevices(enrichedDevices);
      await AsyncStorage.setItem(`rooms_cache_${effectiveHomeId}`, JSON.stringify(roomsWithDevices));
      await AsyncStorage.setItem(`devices_cache_${effectiveHomeId}`, JSON.stringify(enrichedDevices));
    } catch (e) {
      console.error('[useHomeData.refresh] Error refreshing data:', e);
    }
  }, [currentHomeId, enrichAirguards, homeApi, hubApi, homeId, isDemoMode, token]);

  const createRoom = useCallback(async (room: Room): Promise<Room> => {
    if (isDemoMode) {
      // Room creation in demo is handled via DemoContext (DashboardScreen)
      setRooms((prev) => [...prev, room]);
      return room;
    }
    const effectiveHomeId = homeId || currentHomeId;
    if (!effectiveHomeId) {
      throw new Error('No home selected');
    }

    const payload: any = {
      name: room.name?.trim() || '',
      metadata: {
        temperature: room.temperature || 22,
        humidity: room.humidity || 55,
        lights: room.lights || 1,
      },
    };
    
    // Only include optional fields if they have valid values
    if (room.scene && room.scene.trim()) {
      payload.scene = room.scene.trim();
    } else {
      payload.scene = null;
    }
    
    // Only include image if it's a valid non-empty string
    const imageValue = room.image?.trim();
    if (imageValue && imageValue.length > 0) {
      payload.image = imageValue;
    }
    
    // Only include layoutPath if it's a valid non-empty string (and not too long)
    const layoutPathValue = room.layoutPath?.trim();
    if (layoutPathValue && layoutPathValue.length > 0 && layoutPathValue.length < 10000) {
      payload.layoutPath = layoutPathValue;
    }
    
    // Validate accentColor is a valid hex color before including it
    if (room.accentColor) {
      const hexPattern = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
      if (hexPattern.test(room.accentColor)) {
        payload.accentColor = room.accentColor;
      }
    }

    try {
      console.log('[useHomeData] Creating room with payload:', JSON.stringify(payload, null, 2));
      const res = await homeApi.createRoom(effectiveHomeId, payload);
      const createdRaw = unwrap<any>(res, 'room');
      const created = createdRaw ? mapRoom(createdRaw) : null;

      if (!created) {
        throw new Error('Invalid response from createRoom');
      }

      // Refresh to ensure we have canonical data from the backend
      await refresh();
      return created;
    } catch (e: any) {
      console.error('[useHomeData] createRoom failed:', e);
      if (e?.response?.data?.errors) {
        console.error('[useHomeData] Validation errors:', JSON.stringify(e.response.data.errors, null, 2));
      }
      if (e?.response?.data?.error) {
        console.error('[useHomeData] Error message:', e.response.data.error);
      }
      // Provide more helpful error message
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to create room';
      const validationErrors = e?.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const errorDetails = validationErrors.map((err: any) => `${err.path || err.field}: ${err.message || err.msg || 'Invalid'}`).join(', ');
        throw new Error(`Room creation failed: ${errorDetails}`);
      }
      throw new Error(errorMessage);
    }
  }, [currentHomeId, homeApi, homeId, isDemoMode]);

  return { rooms, devices, loading, error, refresh, createRoom, isDemoMode };
};

