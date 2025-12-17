import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { realtimeService, RealtimeEventHandlers } from '../services/realtime';

export const useRealtime = (handlers: RealtimeEventHandlers) => {
  const { user, token } = useAuth();

  const handlersRef = useRef<RealtimeEventHandlers>(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const stableHandlers = useMemo<RealtimeEventHandlers>(() => {
    return {
      onDeviceUpdate: (data) => handlersRef.current.onDeviceUpdate?.(data),
      onEnergyUpdate: (data) => handlersRef.current.onEnergyUpdate?.(data),
      onHubStatus: (data) => handlersRef.current.onHubStatus?.(data),
      onError: (error) => handlersRef.current.onError?.(error),
    };
  }, []);

  useEffect(() => {
    if (user?.homeId && token) {
      realtimeService.connect(user.homeId, token, stableHandlers);
    }

    return () => {
      realtimeService.disconnect();
    };
  }, [user?.homeId, token, stableHandlers]);

  return {
    isConnected: realtimeService.isConnected(),
  };
};



