import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { publishCommand } from '../services/mqttService';
import { getSmartMonitorLatest, getSmartMonitorStatus, getSmartMonitorThresholdsFromInflux } from '../services/influxV1Service';

// Demo-friendly endpoints keyed by the SmartMonitor numeric ID (DEVICE_ID in your ESP32 code)
// These do NOT require a home/device UUID mapping.

export async function getSmartMonitorLatestTelemetry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await getSmartMonitorLatest(String(id));
    
    console.log(`[Airguard] Device ${id} - InfluxDB data:`, data);
    
    if (!data) {
      console.warn(`[Airguard] No telemetry data found for device ${id}`);
      return successResponse(res, { data: null });
    }

    // For demo UI: treat dust as AQI (your ESP32 doesn't publish AQI)
    const response = {
      data: {
        time: data.time,
        temperature: data.temp,
        humidity: data.hum,
        aqi: data.dust,
        pm25: data.dust,
        dust: data.dust,
        mq2: data.mq2,
        alert: !!data.alert,
        alertFlags: data.alertFlags ?? 0,
        buzzerEnabled: !!data.buzzer,
        buzzer: data.buzzer,
        rssi: data.rssi,
        uptime: data.uptime,
      },
    };
    
    console.log(`[Airguard] Device ${id} - Response:`, response.data);
    return successResponse(res, response);
  } catch (error: any) {
    console.error('getSmartMonitorLatestTelemetry error:', error);
    return errorResponse(res, error.message || 'Failed to query telemetry', 500);
  }
}

export async function getSmartMonitorOnlineStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await getSmartMonitorStatus(String(id));
    if (!data) {
      // No status data at all means offline
      return successResponse(res, { data: { time: null, online: false, isStale: true } });
    }

    return successResponse(res, {
      data: {
        time: data.time,
        online: data.online, // Already accounts for staleness in the service
        isStale: data.isStale,
      },
    });
  } catch (error: any) {
    console.error('getSmartMonitorOnlineStatus error:', error);
    return errorResponse(res, error.message || 'Failed to query status', 500);
  }
}

export async function setSmartMonitorBuzzer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { state } = req.body || {};

    const normalized = String(state || '').trim().toUpperCase();
    if (normalized !== 'ON' && normalized !== 'OFF') {
      return errorResponse(res, 'Invalid state. Use {"state":"ON"} or {"state":"OFF"}', 400);
    }

    const topic = `vealive/smartmonitor/${id}/command/buzzer`;
    publishCommand(topic, { state: normalized });

    return successResponse(res, {
      message: 'Buzzer command published',
      topic,
      payload: { state: normalized },
    });
  } catch (error: any) {
    console.error('setSmartMonitorBuzzer error:', error);
    return errorResponse(res, error.message || 'Failed to publish buzzer command', 500);
  }
}

export async function getSmartMonitorThresholds(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    console.log(`[Thresholds] Fetching for SmartMonitor ID: ${id}`);
    
    // Try to get thresholds from InfluxDB (if device has published them)
    const thresholds = await getSmartMonitorThresholdsFromInflux(String(id));
    
    console.log(`[Thresholds] InfluxDB result for device ${id}:`, thresholds);
    
    if (!thresholds) {
      // Return default thresholds if none stored
      console.log(`[Thresholds] No data found, returning defaults`);
      return successResponse(res, {
        data: {
          tempMin: 18,
          tempMax: 30,
          humMin: 30,
          humMax: 70,
          dustHigh: 400,
          mq2High: 60,
          isDefault: true,
        },
      });
    }

    const responseData = {
      time: thresholds.time,
      tempMin: thresholds.tempMin ?? 18,
      tempMax: thresholds.tempMax ?? 30,
      humMin: thresholds.humMin ?? 30,
      humMax: thresholds.humMax ?? 70,
      dustHigh: thresholds.dustHigh ?? thresholds.dust ?? 400,
      mq2High: thresholds.mq2High ?? thresholds.mq2 ?? 60,
      isDefault: false,
    };
    
    console.log(`[Thresholds] Returning data for device ${id}:`, responseData);

    return successResponse(res, { data: responseData });
  } catch (error: any) {
    console.error('getSmartMonitorThresholds error:', error);
    return errorResponse(res, error.message || 'Failed to query thresholds', 500);
  }
}

export async function setSmartMonitorThresholds(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tempMin, tempMax, humMin, humMax, dustHigh, mq2High } = req.body || {};

    // Build thresholds object - only include fields that were provided
    const thresholds: Record<string, number> = {};
    
    if (typeof tempMin === 'number') thresholds.tempMin = tempMin;
    if (typeof tempMax === 'number') thresholds.tempMax = tempMax;
    if (typeof humMin === 'number') thresholds.humMin = humMin;
    if (typeof humMax === 'number') thresholds.humMax = humMax;
    if (typeof dustHigh === 'number') thresholds.dustHigh = dustHigh;
    if (typeof mq2High === 'number') thresholds.mq2High = mq2High;
    
    // Also support legacy field names
    if (typeof req.body?.dust === 'number') thresholds.dustHigh = req.body.dust;
    if (typeof req.body?.mq2 === 'number') thresholds.mq2High = req.body.mq2;

    console.log(`[Airguard] Setting thresholds for device ${id}:`, thresholds);

    // Publish to MQTT topic for the device to receive
    const topic = `vealive/smartmonitor/${id}/command/thresholds`;
    const published = publishCommand(topic, thresholds);

    if (!published) {
      console.warn(`[Airguard] MQTT not connected, thresholds command not sent for device ${id}`);
      return successResponse(res, {
        message: 'Thresholds command queued (MQTT not connected)',
        topic,
        payload: thresholds,
        mqttConnected: false,
        warning: 'MQTT broker is not connected. Please check MQTT_URL environment variable.',
      });
    }

    return successResponse(res, {
      message: 'Thresholds command published',
      topic,
      payload: thresholds,
      mqttConnected: true,
    });
  } catch (error: any) {
    console.error('setSmartMonitorThresholds error:', error);
    return errorResponse(res, error.message || 'Failed to publish thresholds command', 500);
  }
}

export async function publishAirguardCommand(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { topic, payload } = req.body;

    if (!topic || !payload) {
      return errorResponse(res, 'Topic and payload are required', 400);
    }

    console.log(`[Airguard] Publishing command to ${topic}:`, payload);
    const published = publishCommand(topic, payload);

    if (!published) {
      console.warn(`[Airguard] MQTT not connected, command not sent to ${topic}`);
      return successResponse(res, {
        message: 'Command queued (MQTT not connected)',
        topic,
        payload,
        mqttConnected: false,
        warning: 'MQTT broker is not connected. Please check MQTT_URL environment variable.',
      });
    }

    return successResponse(res, {
      message: 'Command published successfully',
      topic,
      payload,
      mqttConnected: true,
    });
  } catch (error: any) {
    console.error('publishAirguardCommand error:', error);
    return errorResponse(res, error.message || 'Failed to publish command', 500);
  }
}