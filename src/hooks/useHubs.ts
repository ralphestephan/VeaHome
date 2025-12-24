import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';
import type { Hub } from '../types';

export const useHubs = (homeId: string | null | undefined) => {
  const { token } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('[useHubs] Hook initialized with homeId:', homeId, 'token:', token ? 'present' : 'missing');

  // Memoize hubApi to prevent infinite loop
  const hubApi = useMemo(() => {
    const client = getApiClient(async () => token);
    return HubApi(client);
  }, [token]);

  useEffect(() => {
    console.log('[useHubs] useEffect triggered - homeId:', homeId);
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
        const response = await hubApi.listHubs(homeId).catch((err) => {
          console.error('[useHubs] API call failed:', err);
          return { data: [] };
        });
        console.log('[useHubs] Received hubs:', response.data?.length || 0, 'hubs');
        if (response.data && response.data.length > 0) {
          console.log('[useHubs] Hub details:', JSON.stringify(response.data, null, 2).substring(0, 500));
        }
        setHubs(response.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load hubs');
        console.error('[useHubs] Error loading hubs:', e);
        setHubs([]);
      } finally {
        setLoading(false);
      }
    };

    loadHubs();
  }, [homeId, hubApi]);

  const refresh = async () => {
    if (!homeId) {
      console.log('[useHubs.refresh] No homeId, skipping');
      return;
    }
    console.log('[useHubs.refresh] Refreshing hubs for home:', homeId);
    try {
      const response = await hubApi.listHubs(homeId).catch((err) => {
        console.error('[useHubs.refresh] API call failed:', err);
        return { data: [] };
      });
      console.log('[useHubs.refresh] Received hubs:', response.data?.length || 0, 'hubs');
      setHubs(response.data || []);
    } catch (e) {
      console.error('[useHubs.refresh] Error refreshing hubs:', e);
      setHubs([]);
    }
  };

  return { hubs, loading, error, refresh };
};



