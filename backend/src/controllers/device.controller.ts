import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getDevicesByHomeId,
  createDevice,
  getDeviceById,
  updateDevice,
  getDeviceWithHub,
} from '../repositories/devicesRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { getHubById } from '../repositories/hubsRepository';
import { getRoomById } from '../repositories/roomsRepository';
import { publishCommand } from '../services/mqttService';
import { recordDeviceActivity } from '../services/telemetryService';

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

    if (!name || !type || !category || !roomId || !hubId) {
      return errorResponse(res, 'Missing required device fields', 400);
    }

    const hub = await getHubById(hubId);
    if (!hub || hub.home_id !== home.id) {
      return errorResponse(res, 'Hub not found', 404);
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
