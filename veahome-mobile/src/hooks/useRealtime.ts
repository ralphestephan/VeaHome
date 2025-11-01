import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { realtimeService, RealtimeEventHandlers } from '../services/realtime';

export const useRealtime = (handlers: RealtimeEventHandlers) => {
  const { user, token } = useAuth();

  useEffect(() => {
    if (user?.homeId && token) {
      realtimeService.connect(user.homeId, token, handlers);
    }

    return () => {
      realtimeService.disconnect();
    };
  }, [user?.homeId, token]);

  return {
    isConnected: realtimeService.isConnected(),
  };
};

