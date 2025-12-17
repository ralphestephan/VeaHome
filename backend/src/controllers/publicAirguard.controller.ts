import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { publishCommand } from '../services/mqttService';
import { getSmartMonitorLatest, getSmartMonitorStatus } from '../services/influxV1Service';

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
      return successResponse(res, { data: null });
    }

    return successResponse(res, {
      data: {
        time: data.time,
        online: !!data.online,
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
