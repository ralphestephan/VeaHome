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

  console.log('🔵 [useHubs v3] Hook initialized with homeId:', homeId, 'refreshTrigger:', refreshTrigger);

  useEffect(() => {
    console.log('🟢 [useHubs v3] ✅ useEffect EXECUTING - homeId:', homeId, 'refreshTrigger:', refreshTrigger);
    if (!homeId) {
      console.log('[useHubs] No homeId provided, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('[useHubs] Loading hubs for home:', homeId);
    const loadHubs = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[useHubs] Calling hubApi.listHubs...');
        const client = getApiClient(async () => token);
        const hubApi = HubApi(client);
        const response = await hubApi.listHubs(homeId);
        
        console.log('[useHubs] Raw API response:', JSON.stringify(response).substring(0, 500));
        console.log('[useHubs] response.data:', JSON.stringify(response.data).substring(0, 500));
        
        // Axios wraps in response.data, backend returns { success: true, data: { hubs: [...] } }
        // So full path is: response.data.data.hubs
        const hubsArray = response.data?.data?.hubs || [];
        console.log('[useHubs] Extracted hubsArray length:', hubsArray.length);
        console.log('[useHubs] response.data.data:', JSON.stringify(response.data?.data || {}).substring(0, 500));
        console.log('[useHubs] response.data.hubs:', JSON.stringify(response.data?.hubs || null).substring(0, 500));
        
        if (hubsArray.length > 0) {
          console.log('[useHubs] First hub:', JSON.stringify(hubsArray[0], null, 2));
        }
        setHubs(hubsArray);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load hubs');
        console.error('[useHubs] Error loading hubs:', e);
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



