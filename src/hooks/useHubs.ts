import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiClient, HubApi } from '../services/api';

export const useHubs = (homeId: string | null | undefined) => {
  const { token } = useAuth();
  const [hubs, setHubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = getApiClient(async () => token);
  const hubApi = HubApi(client);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    const loadHubs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await hubApi.listHubs(homeId).catch(() => ({ data: [] }));
        setHubs(response.data || []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load hubs');
        console.error('Error loading hubs:', e);
        setHubs([]);
      } finally {
        setLoading(false);
      }
    };

    loadHubs();
  }, [homeId, token]);

  const refresh = async () => {
    if (!homeId) return;
    try {
      const response = await hubApi.listHubs(homeId).catch(() => ({ data: [] }));
      setHubs(response.data || []);
    } catch (e) {
      console.error('Error refreshing hubs:', e);
      setHubs([]);
    }
  };

  return { hubs, loading, error, refresh };
};



