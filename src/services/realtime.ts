// Real-time Updates Service
// This service handles WebSocket/MQTT connections for real-time device and energy updates

import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://api.veahome.com';

export interface RealtimeEventHandlers {
  onDeviceUpdate?: (data: { deviceId: string; state: any }) => void;
  onEnergyUpdate?: (data: any) => void;
  onHubStatus?: (data: { hubId: string; status: string }) => void;
  onError?: (error: Error) => void;
}

export class RealtimeService {
  private socket: Socket | null = null;
  private homeId: string | null = null;
  private token: string | null = null;
  private handlers: RealtimeEventHandlers = {};

  connect(homeId: string, token: string, handlers: RealtimeEventHandlers = {}) {
    if (this.socket?.connected && this.homeId === homeId) {
      return; // Already connected
    }

    this.disconnect();
    this.homeId = homeId;
    this.token = token;
    this.handlers = handlers;

    try {
      this.socket = io(API_URL.replace('https://', 'wss://').replace('http://', 'ws://'), {
        auth: { token },
        query: { homeId },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Realtime connected');
      });

      this.socket.on('device:update', (data) => {
        handlers.onDeviceUpdate?.(data);
      });

      this.socket.on('energy:update', (data) => {
        handlers.onEnergyUpdate?.(data);
      });

      this.socket.on('hub:status', (data) => {
        handlers.onHubStatus?.(data);
      });

      this.socket.on('error', (error) => {
        console.error('Realtime error:', error);
        handlers.onError?.(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Realtime disconnected');
      });
    } catch (error) {
      console.error('Failed to connect realtime:', error);
      handlers.onError?.(error as Error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.homeId = null;
    this.token = null;
    this.handlers = {};
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();



