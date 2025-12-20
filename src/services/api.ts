import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';

const { extra } = Constants.expoConfig ?? {};

const resolveApiBaseUrl = (): string => {
  const raw = (extra?.apiBaseUrl as string) || 'http://localhost:3000';
  if (!raw.includes('localhost')) return raw;

  const expoHostUri =
    Constants.expoGoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.hostUri;

  if (!expoHostUri) {
    return raw;
  }

  const host = expoHostUri.split(':')[0];
  const portMatch = raw.match(/:(\d{2,5})/);
  const port = portMatch ? portMatch[1] : '8000';
  return `http://${host}:${port}`;
};

const API_BASE_URL: string = resolveApiBaseUrl();

let apiClient: AxiosInstance | null = null;
let tokenProvider: (() => Promise<string | null>) | undefined;

export const getApiClient = (getToken?: () => Promise<string | null>): AxiosInstance => {
  if (getToken) tokenProvider = getToken;
  if (!apiClient) {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
    });

    apiClient.interceptors.request.use(async (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log('[API] Request data:', JSON.stringify(config.data).substring(0, 200));
      }
      
      if (tokenProvider) {
        const token = await tokenProvider();
        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    apiClient.interceptors.response.use(
      (response) => {
        console.log(`[API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`[API] Error ${error.response.status} ${error.config?.url}`);
          console.error('[API] Error data:', error.response.data);
        } else {
          console.error(`[API] Network error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }
  return apiClient;
};

// Auth endpoints
export const AuthApi = (client: AxiosInstance) => ({
  login: (email: string, password: string) => client.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => client.post('/auth/register', { name, email, password }),
  me: () => client.get('/auth/me'),
});

// Hub & devices
export const HubApi = (client: AxiosInstance) => ({
  pairHub: (qrCode: string, homeId: string) => client.post('/hub/pair', { qrCode, homeId }),
  listDevices: (homeId: string) => client.get(`/homes/${homeId}/devices`),
  addDevice: (homeId: string, payload: any) => client.post(`/homes/${homeId}/devices`, payload),
  learnSignal: (hubId: string, deviceId: string, action: string) => client.post(`/hubs/${hubId}/devices/${deviceId}/learn`, { action }),
  controlDevice: (homeId: string, deviceId: string, payload: any) => client.put(`/homes/${homeId}/devices/${deviceId}/control`, payload),
  getDevice: (homeId: string, deviceId: string) => client.get(`/homes/${homeId}/devices/${deviceId}`),
  deleteDevice: (homeId: string, deviceId: string) => client.delete(`/homes/${homeId}/devices/${deviceId}`),
  // Hub setup
  connectWifi: (hubId: string, ssid: string, password: string) => client.post(`/hubs/${hubId}/wifi`, { ssid, password }),
  assignRooms: (hubId: string, roomIds: string[]) => client.post(`/hubs/${hubId}/rooms`, { roomIds }),
  getHubStatus: (hubId: string) => client.get(`/hubs/${hubId}/status`),
  // Get hubs
  listHubs: (homeId: string) => client.get(`/homes/${homeId}/hubs`),
});

// Rooms & energy
export const HomeApi = (client: AxiosInstance) => ({
  getHome: (homeId: string) => client.get(`/homes/${homeId}`),
  deleteHome: (homeId: string) => client.delete(`/homes/${homeId}`),
  getRooms: (homeId: string) => client.get(`/homes/${homeId}/rooms`),
  createRoom: (homeId: string, payload: any) => client.post(`/homes/${homeId}/rooms`, payload),
  getRoom: (homeId: string, roomId: string) => client.get(`/homes/${homeId}/rooms/${roomId}`),
  updateRoom: (homeId: string, roomId: string, payload: any) => client.put(`/homes/${homeId}/rooms/${roomId}`, payload),
  deleteRoom: (homeId: string, roomId: string) => client.delete(`/homes/${homeId}/rooms/${roomId}`),
  updateRoomLayout: (homeId: string, layout: any) => client.put(`/homes/${homeId}/layout`, { layout }),
  getEnergy: (homeId: string, range?: 'day' | 'week' | 'month') => {
    const params = range ? { range } : {};
    return client.get(`/homes/${homeId}/energy`, { params });
  },
  getRoomEnergy: (homeId: string, roomId: string) => client.get(`/homes/${homeId}/rooms/${roomId}/energy`),
});

// Scenes & schedules
export const ScenesApi = (client: AxiosInstance) => ({
  listScenes: (homeId: string) => client.get(`/homes/${homeId}/scenes`),
  createScene: (homeId: string, payload: any) => client.post(`/homes/${homeId}/scenes`, payload),
  updateScene: (homeId: string, sceneId: string, payload: any) => client.put(`/homes/${homeId}/scenes/${sceneId}`, payload),
  deleteScene: (homeId: string, sceneId: string) => client.delete(`/homes/${homeId}/scenes/${sceneId}`),
  activateScene: (homeId: string, sceneId: string) => client.put(`/homes/${homeId}/scenes/${sceneId}/activate`, {}),
});

// Schedules
export const SchedulesApi = (client: AxiosInstance) => ({
  listSchedules: (homeId: string) => client.get(`/homes/${homeId}/schedules`),
  createSchedule: (homeId: string, payload: any) => client.post(`/homes/${homeId}/schedules`, payload),
  updateSchedule: (homeId: string, scheduleId: string, payload: any) => client.put(`/homes/${homeId}/schedules/${scheduleId}`, payload),
  deleteSchedule: (homeId: string, scheduleId: string) => client.delete(`/homes/${homeId}/schedules/${scheduleId}`),
});

// Multi-home
export const HomesApi = (client: AxiosInstance) => ({
  listHomes: () => client.get(`/homes`),
  createHome: (name: string) => client.post(`/homes`, { name }),
});

// Public/demo Airguard endpoints (Influx v1 + MQTT buzzer command)
export const PublicAirguardApi = (client: AxiosInstance) => ({
  getLatest: (smartMonitorId: number | string) => client.get(`/public/airguard/${smartMonitorId}/latest`),
  getStatus: (smartMonitorId: number | string) => client.get(`/public/airguard/${smartMonitorId}/status`),
  setBuzzer: (smartMonitorId: number | string, state: 'ON' | 'OFF') =>
    client.post(`/public/airguard/${smartMonitorId}/buzzer`, { state }),
  getThresholds: (smartMonitorId: number | string) => 
    client.get(`/public/airguard/${smartMonitorId}/thresholds`),
  setThresholds: (smartMonitorId: number | string, thresholds: { 
    tempMin?: number; 
    tempMax?: number; 
    humMin?: number; 
    humMax?: number; 
    dustHigh?: number; 
    mq2High?: number;
  }) => client.post(`/public/airguard/${smartMonitorId}/thresholds`, thresholds),
});

// Device Groups
export const DeviceGroupsApi = (client: AxiosInstance) => ({
  listGroups: (homeId: string) => client.get(`/homes/${homeId}/device-groups`),
  createGroup: (homeId: string, payload: any) => client.post(`/homes/${homeId}/device-groups`, payload),
  updateGroup: (homeId: string, groupId: string, payload: any) => client.put(`/homes/${homeId}/device-groups/${groupId}`, payload),
  deleteGroup: (homeId: string, groupId: string) => client.delete(`/homes/${homeId}/device-groups/${groupId}`),
});

// Automations
export const AutomationsApi = (client: AxiosInstance) => ({
  listAutomations: (homeId: string) => client.get(`/homes/${homeId}/automations`),
  createAutomation: (homeId: string, payload: any) => client.post(`/homes/${homeId}/automations`, payload),
  updateAutomation: (homeId: string, automationId: string, payload: any) => client.put(`/homes/${homeId}/automations/${automationId}`, payload),
  deleteAutomation: (homeId: string, automationId: string) => client.delete(`/homes/${homeId}/automations/${automationId}`),
});

// Device History
export const DeviceHistoryApi = (client: AxiosInstance) => ({
  getDeviceHistory: (homeId: string, deviceId: string, range?: string) => client.get(`/homes/${homeId}/devices/${deviceId}/history`, { params: { range } }),
});

// Home Members
export const HomeMembersApi = (client: AxiosInstance) => ({
  getMembers: (homeId: string) => client.get(`/homes/${homeId}/members`),
  createInvitation: (homeId: string, email: string, role?: string) => 
    client.post(`/homes/${homeId}/invitations`, { email, role }),
  getPendingInvitations: (homeId: string) => client.get(`/homes/${homeId}/invitations`),
  acceptInvitation: (token: string) => client.post(`/homes/invitations/${token}/accept`),
  cancelInvitation: (invitationId: string, homeId: string) => 
    client.delete(`/homes/invitations/${invitationId}`, { data: { homeId } }),
  removeMember: (homeId: string, memberId: string) => 
    client.delete(`/homes/${homeId}/members/${memberId}`),
  createFamilyMember: (homeId: string, payload: { name: string; email: string; password: string; role?: string }) =>
    client.post(`/homes/${homeId}/family-members`, payload),
});


