import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';

export const useDeviceControl = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);

  const controlDevice = async (
    deviceId: string,
    payload: { isActive?: boolean; value?: number; unit?: string }
  ) => {
    if (!user?.homeId) return;
    
    setLoading(deviceId);
    try {
      await hubApi.controlDevice(user.homeId, deviceId, payload);
    } catch (e) {
      console.error('Error controlling device:', e);
      throw e;
    } finally {
      setLoading(null);
    }
  };

  const toggleDevice = async (deviceId: string, currentState: boolean) => {
    await controlDevice(deviceId, { isActive: !currentState });
  };

  const setValue = async (deviceId: string, value: number, unit?: string) => {
    await controlDevice(deviceId, { value, unit });
  };

  return { controlDevice, toggleDevice, setValue, loading };
};


