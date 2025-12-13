import { useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi, HubApi } from '../services/api';
import { Room, Device } from '../types';
import { initialDemoDevices, initialDemoRooms } from '../context/DemoContext';

const DEMO_ROOMS_STORAGE_KEY = 'veahome_demo_rooms';

export const useHomeData = (homeId: string | null | undefined) => {
  const { token, currentHomeId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customRooms, setCustomRooms] = useState<Room[]>([]);

  const isDemoMode = !token || token === 'DEMO_TOKEN';

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);
  const hubApi = HubApi(client);

  useEffect(() => {
    const effectiveHomeId = homeId || currentHomeId;

    if (isDemoMode) {
      let mounted = true;
      (async () => {
        try {
          setLoading(true);
          const saved = await AsyncStorage.getItem(DEMO_ROOMS_STORAGE_KEY);
          const parsed: Room[] = saved ? JSON.parse(saved) : [];
          if (!mounted) return;
          setCustomRooms(parsed);
          setRooms([...initialDemoRooms, ...parsed]);
          setDevices(initialDemoDevices);
          setError(null);
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
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
          const roomsData = roomsRes.data || [];
          const devicesData = devicesRes.data || [];
          setRooms(roomsData);
          setDevices(devicesData);
          await AsyncStorage.setItem(`rooms_cache_${effectiveHomeId}`, JSON.stringify(roomsData));
          await AsyncStorage.setItem(`devices_cache_${effectiveHomeId}`, JSON.stringify(devicesData));
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

  const refresh = async () => {
    const effectiveHomeId = homeId || currentHomeId;
    if (isDemoMode) {
      setRooms([...initialDemoRooms, ...customRooms]);
      setDevices(initialDemoDevices);
      return;
    }
    if (!effectiveHomeId || !token) return;
    try {
      const [roomsRes, devicesRes] = await Promise.all([
        homeApi.getRooms(effectiveHomeId),
        hubApi.listDevices(effectiveHomeId),
      ]);
      const roomsData = roomsRes.data || [];
      const devicesData = devicesRes.data || [];
      setRooms(roomsData);
      setDevices(devicesData);
      await AsyncStorage.setItem(`rooms_cache_${effectiveHomeId}`, JSON.stringify(roomsData));
      await AsyncStorage.setItem(`devices_cache_${effectiveHomeId}`, JSON.stringify(devicesData));
    } catch (e) {
      console.error('Error refreshing data:', e);
    }
  };

  const createRoom = async (room: Room) => {
    if (isDemoMode) {
      const updatedCustomRooms = [...customRooms, room];
      setCustomRooms(updatedCustomRooms);
      const nextRooms = [...initialDemoRooms, ...updatedCustomRooms];
      setRooms(nextRooms);
      try {
        await AsyncStorage.setItem(
          DEMO_ROOMS_STORAGE_KEY,
          JSON.stringify(updatedCustomRooms)
        );
      } catch (storageError) {
        console.warn('Unable to persist demo rooms locally:', storageError);
      }
      return;
    }

    // TODO: POST to backend when rooms endpoint is available
    setRooms((prev) => [...prev, room]);
    console.warn('Room creation API not yet available. Showing temporary room locally.');
  };

  return { rooms, devices, loading, error, refresh, createRoom, isDemoMode };
};

