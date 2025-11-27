// AWS IoT Core MQTT service
// This will be fully implemented when AWS credentials are available

import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane';

let iotClient: IoTDataPlaneClient | null = null;

export function initializeIoT() {
  if (process.env.AWS_IOT_ENDPOINT) {
    iotClient = new IoTDataPlaneClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: `https://${process.env.AWS_IOT_ENDPOINT}`,
    });
    console.log('AWS IoT Core client initialized');
  } else {
    console.warn('AWS IoT endpoint not configured. IoT features will be simulated.');
  }
}

export async function publishToHub(topic: string, payload: any) {
  try {
    if (iotClient) {
      const command = new PublishCommand({
        topic,
        payload: Buffer.from(JSON.stringify(payload)),
        qos: 1,
      });
      await iotClient.send(command);
      console.log(`Published to ${topic}:`, payload);
    } else {
      console.log(`[SIMULATED] Would publish to ${topic}:`, payload);
    }
  } catch (error) {
    console.error('IoT publish error:', error);
    throw error;
  }
}

export async function publishDeviceControl(hubMqttTopic: string, deviceId: string, command: any) {
  const topic = `${hubMqttTopic}/devices/${deviceId}/control`;
  return publishToHub(topic, command);
}

export async function publishWifiConfig(hubMqttTopic: string, ssid: string, password: string) {
  const topic = `${hubMqttTopic}/wifi/config`;
  return publishToHub(topic, { ssid, password });
}

export async function publishLearnSignal(hubMqttTopic: string, deviceId: string, action: string) {
  const topic = `${hubMqttTopic}/devices/${deviceId}/learn`;
  return publishToHub(topic, { action, mode: 'learn' });
}
