import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HomeApi } from '../services/api';
import { EnergyData } from '../types';
import { mockEnergyData } from '../constants/mockData';

export const useEnergyData = (homeId: string | null | undefined, range: 'day' | 'week' | 'month' = 'day') => {
  const { token } = useAuth();
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDemoMode = token === 'DEMO_TOKEN';

  const client = getApiClient(async () => token);
  const homeApi = HomeApi(client);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      if (isDemoMode) {
        setEnergyData(mockEnergyData);
        setError(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const net = await NetInfo.fetch();
        if (net.isConnected) {
          const response = await homeApi.getEnergy(homeId, range);
          const payload = (response.data as any)?.data ?? response.data;
          const data: EnergyData[] = Array.isArray(payload) ? payload : [];
          setEnergyData(data);
          await AsyncStorage.setItem(
            `energy_cache_${homeId}_${range}`,
            JSON.stringify(data)
          );
        } else {
          const cache = await AsyncStorage.getItem(
            `energy_cache_${homeId}_${range}`
          );
          const parsed = cache ? JSON.parse(cache) : [];
          setEnergyData(Array.isArray(parsed) ? parsed : []);
          setError('Offline mode');
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load energy data');
        console.error('Error loading energy data:', e);
        const cache = await AsyncStorage.getItem(
          `energy_cache_${homeId}_${range}`
        );
        if (cache) {
          const parsed = JSON.parse(cache);
          setEnergyData(Array.isArray(parsed) ? parsed : []);
        } else {
          setEnergyData([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [homeId, range, token, isDemoMode]);

  const refresh = async () => {
    if (!homeId) return;
    if (isDemoMode) {
      setEnergyData(mockEnergyData);
      return;
    }
    try {
      const response = await homeApi.getEnergy(homeId, range);
      const payload = (response.data as any)?.data ?? response.data;
      const data: EnergyData[] = Array.isArray(payload) ? payload : [];
      setEnergyData(data);
      await AsyncStorage.setItem(
        `energy_cache_${homeId}_${range}`,
        JSON.stringify(data)
      );
    } catch (e) {
      console.error('Error refreshing energy data:', e);
    }
  };

  return { energyData, loading, error, refresh };
};

