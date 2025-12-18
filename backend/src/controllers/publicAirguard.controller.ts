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
    if (!data) {
      return successResponse(res, { data: null });
    }

    // For demo UI: treat dust as AQI (your ESP32 doesn't publish AQI)
    return successResponse(res, {
      data: {
        time: data.time,
        temperature: data.temp,
        humidity: data.hum,
        aqi: data.dust,
        pm25: data.dust,
        dust: data.dust,
        mq2: data.mq2,
        alert: !!data.alert,
        buzzerEnabled: !!data.buzzer,
        rssi: data.rssi,
        uptime: data.uptime,
      },
    });
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
    
    // Try to get thresholds from InfluxDB (if device has published them)
    const thresholds = await getSmartMonitorThresholdsFromInflux(String(id));
    
    if (!thresholds) {
      // Return default thresholds if none stored
      return successResponse(res, {
        data: {
          tempHigh: 35,
          humidityHigh: 80,
          dustHigh: 400,
          mq2High: 60,
          isDefault: true,
        },
      });
    }

    return successResponse(res, {
      data: {
        time: thresholds.time,
        tempHigh: thresholds.tempHigh,
        humidityHigh: thresholds.humidityHigh,
        dustHigh: thresholds.dustHigh,
        mq2High: thresholds.mq2High,
        isDefault: false,
      },
    });
  } catch (error: any) {
    console.error('getSmartMonitorThresholds error:', error);
    return errorResponse(res, error.message || 'Failed to query thresholds', 500);
  }
}

export async function setSmartMonitorThresholds(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tempHigh, humidityHigh, dustHigh, mq2High } = req.body || {};

    // Validate thresholds
    const thresholds = {
      tempHigh: typeof tempHigh === 'number' ? tempHigh : 35,
      humidityHigh: typeof humidityHigh === 'number' ? humidityHigh : 80,
      dustHigh: typeof dustHigh === 'number' ? dustHigh : 400,
      mq2High: typeof mq2High === 'number' ? mq2High : 60,
    };

    // Publish to MQTT topic for the device to receive
    const topic = `vealive/smartmonitor/${id}/command/thresholds`;
    publishCommand(topic, thresholds);

    return successResponse(res, {
      message: 'Thresholds command published',
      topic,
      payload: thresholds,
    });
  } catch (error: any) {
    console.error('setSmartMonitorThresholds error:', error);
    return errorResponse(res, error.message || 'Failed to publish thresholds command', 500);
  }
}
