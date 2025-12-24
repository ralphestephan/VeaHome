import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';
import type { Hub } from '../types';

export const useHubs = (homeId: string | null | undefined) => {
  const { token } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🔵 [useHubs v2] Hook initialized with homeId:', homeId, 'token:', token ? 'present' : 'missing');
  console.log('🟡 [useHubs v2] BEFORE useEffect definition');

  useEffect(() => {
    console.log('🟢 [useHubs v2] ✅ useEffect EXECUTING - homeId:', homeId, 'token:', token ? 'present' : 'missing');
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
        
        // Backend returns { success: true, data: { hubs: [...] } }
        const hubsArray = response.data?.hubs || [];
        console.log('[useHubs] Received hubs:', hubsArray.length, 'hubs');
        if (hubsArray.length > 0) {
          console.log('[useHubs] Hub details:', JSON.stringify(hubsArray, null, 2).substring(0, 500));
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
  }, [homeId, token]);

  const refresh = async () => {
    if (!homeId) {
      console.log('[useHubs.refresh] No homeId, skipping');
      return;
    }
    console.log('[useHubs.refresh] Refreshing hubs for home:', homeId);
    try {
      const client = getApiClient(async () => token);
      const hubApi = HubApi(client);
      const response = await hubApi.listHubs(homeId).catch((err) => {
        console.error('[useHubs.refresh] API call failed:', err);
        return { data: { hubs: [] } };
      });
      
      // Backend returns { success: true, data: { hubs: [...] } }
      const hubsArray = response.data?.hubs || [];
      console.log('[useHubs.refresh] Received hubs:', hubsArray.length, 'hubs');
      setHubs(hubsArray);
    } catch (e) {
      console.error('[useHubs.refresh] Error refreshing hubs:', e);
      setHubs([]);
    }
  };

  return { hubs, loading, error, refresh };
};



