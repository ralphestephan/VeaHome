import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';
import type { Hub } from '../types';

const mapHub = (raw: any): Hub => {
  return {
    id: raw.id,
    name: raw.name,
    brand: raw.brand || 'vealive',
    hubType: raw.hubType || raw.hub_type || 'airguard',
    serialNumber: raw.serialNumber || raw.serial_number || '',
    status: raw.status || 'offline',
    roomId: raw.roomId || raw.room_id,
    homeId: raw.homeId || raw.home_id,
    wifiSsid: raw.wifiSsid || raw.wifi_ssid,
    wifiConnected: raw.wifiConnected ?? raw.wifi_connected,
    firmwareVersion: raw.firmwareVersion || raw.firmware_version,
    lastSeenAt: raw.lastSeenAt || raw.last_seen_at,
    metadata: raw.metadata,
    airQualityData: raw.airQualityData,
    devices: raw.devices,
  };
};

export const useHubs = (homeId: string | null | undefined) => {
  const { token } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    const loadHubs = async () => {
      try {
        setLoading(true);
        setError(null);
        const client = getApiClient(async () => token);
        const hubApi = HubApi(client);
        const response = await hubApi.listHubs(homeId);
        
        // Axios wraps in response.data, backend returns { success: true, data: { hubs: [...] } }
        // So full path is: response.data.data.hubs
        const hubsArray = response.data?.data?.hubs || [];
        const mappedHubs = hubsArray.map(mapHub);
        setHubs(mappedHubs);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load hubs');
        setHubs([]);
      } finally {
        setLoading(false);
      }
    };

    loadHubs();
  }, [homeId, token, refreshTrigger]);

  const refresh = () => {
    console.log('[useHubs.refresh] Triggering refresh by incrementing trigger');
    setRefreshTrigger(prev => prev + 1);
  };

  return { hubs, loading, error, refresh };
};



