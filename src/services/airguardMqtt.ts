import { getApiClient } from './api';

/**
 * Publish a command to an AirGuard device via MQTT (through backend API)
 * @param deviceId - The AirGuard device ID (e.g., "1")
 * @param deviceType - The type of device being controlled: "ac", "dehumidifier", or "shutters"
 * @param command - The command payload
 */
export async function publishAirguardCommand(
  deviceId: string,
  deviceType: 'ac' | 'dehumidifier' | 'shutters',
  command: any,
  getToken?: () => Promise<string | null>
): Promise<void> {
  const topic = `vealive/smartmonitor/${deviceId}/command/${deviceType}`;
  
  try {
    const client = getApiClient(getToken);
    const response = await client.post(`/public/airguard/${deviceId}/command`, {
      topic,
      payload: command,
    });
    
    console.log(`[AirguardMQTT] Published to ${topic}:`, command);
    return response.data;
  } catch (error: any) {
    console.error('[AirguardMQTT] Error:', error);
    throw error;
  }
}

/**
 * Publish a learn command to an AirGuard device
 * @param deviceId - The AirGuard device ID
 * @param signalType - "ir" or "rf"
 * @param device - Device name: "ac", "dehumidifier", or "shutters"
 * @param action - Action name: "power_on", "power_off", "temp_24", etc.
 */
export async function publishLearnCommand(
  deviceId: string,
  signalType: 'ir' | 'rf',
  device: string,
  action: string,
  getToken?: () => Promise<string | null>
): Promise<void> {
  const topic = `vealive/smartmonitor/${deviceId}/command/learn/${signalType}`;
  
  try {
    const client = getApiClient(getToken);
    const response = await client.post(`/public/airguard/${deviceId}/command`, {
      topic,
      payload: { device, action },
    });
    
    console.log(`[AirguardMQTT] Published learn command to ${topic}:`, { device, action });
    return response.data;
  } catch (error: any) {
    console.error('[AirguardMQTT] Error:', error);
    throw error;
  }
}

