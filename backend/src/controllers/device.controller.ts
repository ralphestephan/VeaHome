import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getDevicesByHomeId,
  createDevice,
  getDeviceById,
  updateDevice,
  getDeviceWithHub,
  deleteDevice,
} from '../repositories/devicesRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { createHub, getHubById } from '../repositories/hubsRepository';
import { getRoomById } from '../repositories/roomsRepository';
import { publishCommand } from '../services/mqttService';
import { recordDeviceActivity } from '../services/telemetryService';
import { getSmartMonitorConfig } from '../services/influxV1Service';
import { randomUUID } from 'crypto';

export async function listDevices(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const devices = await getDevicesByHomeId(home.id);
    return successResponse(res, { devices });
  } catch (error: any) {
    console.error('List devices error:', error);
    return errorResponse(res, error.message || 'Failed to list devices', 500);
  }
}

export async function addDevice(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, type, category, roomId, hubId, unit, signalMappings } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const normalizedHubId = typeof hubId === 'string' ? hubId.trim() : hubId;
    const isStandaloneProduct = type === 'airguard';
    const requiresHub = !isStandaloneProduct;

    if (!name || !type || !category || !roomId || (requiresHub && !normalizedHubId)) {
      return errorResponse(res, 'Missing required device fields', 400);
    }

    let hub = null as any;
    if (normalizedHubId) {
      hub = await getHubById(normalizedHubId);
      if (!hub || hub.home_id !== home.id) {
        return errorResponse(res, 'Hub not found', 404);
      }
    } else {
      // Airguard (VeaAir) is a standalone product (ESP32 inside) so we auto-provision it as a hub.
      hub = await createHub({
        homeId: home.id,
        serialNumber: `veaair-${randomUUID()}`,
        name: `${String(name).trim()} (VeaAir)`,
        status: 'paired',
        ownerId: userId,
      });
    }

    const room = await getRoomById(roomId);
    if (!room || room.home_id !== home.id) {
      return errorResponse(res, 'Room not found', 404);
    }

    const device = await createDevice({
      homeId: home.id,
      hubId: hub.id,
      roomId: room.id,
      name: name.trim(),
      type,
      category,
      unit,
      signalMappings: signalMappings && typeof signalMappings === 'object' ? signalMappings : undefined,
    });

    return successResponse(
      res,
      {
        message: 'Device added successfully',
        device,
      },
      201
    );
  } catch (error: any) {
    console.error('Add device error:', error);
    return errorResponse(res, error.message || 'Failed to add device', 500);
  }
}

export async function getDevice(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    return successResponse(res, { device });
  } catch (error: any) {
    console.error('Get device error:', error);
    return errorResponse(res, error.message || 'Failed to get device', 500);
  }
}

export async function controlDevice(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;
    const controlPayload = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    const deviceWithHub = await getDeviceWithHub(deviceId);
    const mqttTopic = deviceWithHub?.mqtt_topic || `hubs/${device.hub_id}`;
    if (!mqttTopic) {
      console.warn('Device has no MQTT topic configured', { deviceId });
    }

    // Build MQTT command
    const command: any = {
      deviceId,
      timestamp: new Date().toISOString(),
    };

    if (controlPayload.isActive !== undefined) {
      command.action = controlPayload.isActive ? 'ON' : 'OFF';
      command.signal = (device.signal_mappings || {})[command.action];
    }

    if (controlPayload.value !== undefined) {
      command.value = controlPayload.value;
      if (device.type === 'thermostat' || device.type === 'ac') {
        command.action = controlPayload.value > (device.value || 0) ? 'TEMP_UP' : 'TEMP_DOWN';
        command.signal = (device.signal_mappings || {})[command.action];
      }
    }

    if (mqttTopic) {
      publishCommand(`${mqttTopic}/devices/${deviceId}/control`, command);
    }

    const partialUpdate: any = {};
    if (typeof controlPayload.isActive === 'boolean') {
      partialUpdate.isActive = controlPayload.isActive;
    }
    if (typeof controlPayload.value === 'number') {
      partialUpdate.value = controlPayload.value;
    }

    if (Object.keys(partialUpdate).length) {
      await updateDevice(deviceId, partialUpdate);
      await recordDeviceActivity({
        homeId: home.id,
        roomId: device.room_id,
        deviceId,
        category: device.category,
        value: typeof partialUpdate.value === 'number' ? partialUpdate.value : undefined,
        isActive: typeof partialUpdate.isActive === 'boolean' ? partialUpdate.isActive : undefined,
        source: 'manual-control',
      });
    }

    // TODO: Emit WebSocket event for real-time updates
    console.log(`Emitting device:update event for device ${deviceId}`);

    return successResponse(res, {
      message: 'Device control command sent',
      deviceId,
    });
  } catch (error: any) {
    console.error('Control device error:', error);
    return errorResponse(res, error.message || 'Failed to control device', 500);
  }
}

export async function learnSignal(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { hubId, deviceId } = req.params;
    const { action } = req.body;

    const hub = await getHubById(hubId);
    if (!hub) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const home = await ensureHomeAccess(res, hub.home_id, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    // TODO: Publish learn command to hub via MQTT
    const mqttTopic = hub.mqtt_topic || `hubs/${hub.id}`;
    publishCommand(`${mqttTopic}/devices/${deviceId}/learn`, { action });

    // Simulate signal learning (in real scenario, hub will report back the learned signal)
    const learnedSignal = `SIGNAL_${action}_${Date.now()}`;
    
    // Update signal mappings
    const signalMappings = device.signal_mappings || {};
    signalMappings[action] = learnedSignal;

    await updateDevice(deviceId, { signalMappings });

    return successResponse(res, {
      message: 'Signal learned successfully',
      action,
      signal: learnedSignal,
    });
  } catch (error: any) {
    console.error('Learn signal error:', error);
    return errorResponse(res, error.message || 'Failed to learn signal', 500);
  }
}

export async function getDeviceHistory(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;
    const { range } = req.query;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    // TODO: Query from time-series database (InfluxDB or Timestream)
    // For now, return mock data
    const history = [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event: 'Device turned on',
        state: { isActive: true },
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        event: 'Device turned off',
        state: { isActive: false },
      },
    ];

    return successResponse(res, { history });
  } catch (error: any) {
    console.error('Get device history error:', error);
    return errorResponse(res, error.message || 'Failed to get device history', 500);
  }
}

export async function removeDevice(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    await deleteDevice(deviceId);
    return successResponse(res, { message: 'Device deleted' });
  } catch (error: any) {
    console.error('Delete device error:', error);
    return errorResponse(res, error.message || 'Failed to delete device', 500);
  }
}

export async function getDeviceThresholds(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    if (device.type !== 'airguard') {
      return errorResponse(res, 'Only AirGuard devices have thresholds', 400);
    }

    // Device ID is stored as numeric ID
    const deviceNumericId = parseInt(device.id, 10);
    if (isNaN(deviceNumericId)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    // Fetch thresholds from InfluxDB smartmonitor_config measurement
    const config = await getSmartMonitorConfig(deviceNumericId);
    
    if (!config) {
      // Return defaults if no config found
      console.log(`[Thresholds] No config found for device ${deviceNumericId}, returning defaults`);
      return successResponse(res, {
        tempMin: 10,
        tempMax: 35,
        humMin: 20,
        humMax: 80,
        dustHigh: 400,
        mq2High: 60,
      });
    }

    console.log(`[Thresholds] Found config for device ${deviceNumericId}:`, config);
    return successResponse(res, config);
  } catch (error: any) {
    console.error('Get device thresholds error:', error);
    return errorResponse(res, error.message || 'Failed to get thresholds', 500);
  }
}

export async function setDeviceThresholds(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, deviceId } = req.params;
    const { tempMin, tempMax, humMin, humMax, dustHigh, mq2High } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const device = await getDeviceById(deviceId);
    if (!device || device.home_id !== home.id) {
      return errorResponse(res, 'Device not found', 404);
    }

    if (device.type !== 'airguard') {
      return errorResponse(res, 'Only AirGuard devices have thresholds', 400);
    }

    const deviceNumericId = parseInt(device.id, 10);
    if (isNaN(deviceNumericId)) {
      return errorResponse(res, 'Invalid device ID', 400);
    }

    // Publish threshold update to MQTT - device will update and republish to config topic
    const topic = `vealive/smartmonitor/${deviceNumericId}/set/config`;
    const payload = JSON.stringify({
      tempMin,
      tempMax,
      humMin,
      humMax,
      dustHigh,
      mq2High,
    });

    await publishCommand(topic, payload);
    console.log(`[Thresholds] Published to ${topic}:`, payload);

    return successResponse(res, { 
      message: 'Thresholds updated',
      thresholds: { tempMin, tempMax, humMin, humMax, dustHigh, mq2High },
    });
  } catch (error: any) {
    console.error('Set device thresholds error:', error);
    return errorResponse(res, error.message || 'Failed to set thresholds', 500);
  }
}
