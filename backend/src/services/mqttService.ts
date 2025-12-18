type GenericMqttClient = {
  publish: (topic: string, payload: string, options?: Record<string, unknown>, cb?: (err?: Error) => void) => void;
  subscribe?: (topic: string) => void;
  end: () => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
};

let client: GenericMqttClient | null = null;
let isConnected = false;

export function initMqttClient() {
  if (client || isConnected) return;

  const url = process.env.MQTT_URL;
  if (!url && !process.env.AWS_IOT_ENDPOINT) {
    console.warn('[mqtt] No MQTT_URL or AWS_IOT_ENDPOINT provided. Skipping MQTT init.');
    return;
  }

  try {
    if (url) {
      // Try plain MQTT broker first
      const mqtt = require('mqtt');
      client = mqtt.connect(url, {
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 5000,
      });
    } else {
      const { device } = require('aws-iot-device-sdk');
      client = device({
        host: process.env.AWS_IOT_ENDPOINT,
        protocol: 'wss',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
        region: process.env.AWS_REGION,
      });
    }

    client?.on('connect', () => {
      isConnected = true;
      console.log('[mqtt] Connected');
    });

    client?.on('error', (error: Error) => {
      console.error('[mqtt] Error', error);
    });

    client?.on('close', () => {
      isConnected = false;
      console.warn('[mqtt] Connection closed');
    });
  } catch (error) {
    console.error('[mqtt] Failed to initialize client', error);
  }
}

export function publishCommand(topic: string, payload: Record<string, unknown>) {
  const message = JSON.stringify(payload);
  console.log(`[mqtt] Publishing to ${topic}:`, message);
  
  if (!client || !isConnected) {
    console.warn('[mqtt] Client not ready, skipping publish. Topic:', topic);
    return false;
  }
  
  client.publish(topic, message, undefined, (err) => {
    if (err) {
      console.error('[mqtt] Publish failed', err);
    } else {
      console.log('[mqtt] Successfully published to', topic);
    }
  });
  return true;
}

export function shutdownMqtt() {
  if (client) {
    client.end();
    client = null;
    isConnected = false;
  }
}
