import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';
import type { Hub } from '../types';

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
        setHubs(hubsArray);
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



