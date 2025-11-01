import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi, HubApi } from '../services/api';
import { Room, Device } from '../types';

export const useHomeData = (homeId: string | null | undefined) => {
  const { token, currentHomeId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);
  const hubApi = HubApi(client);

  useEffect(() => {
    const effectiveHomeId = homeId || currentHomeId;
    if (!effectiveHomeId) {
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
        // fallback to cache
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
  }, [homeId, currentHomeId, token]);

  const refresh = async () => {
    const effectiveHomeId = homeId || currentHomeId;
    if (!effectiveHomeId) return;
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

  return { rooms, devices, loading, error, refresh };
};

