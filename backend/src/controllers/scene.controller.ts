import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getScenes,
  saveScene,
  updateScene as updateSceneRecord,
  deleteScene as deleteSceneRecord,
  getSceneById,
  deactivateScenes,
  setSceneActive,
} from '../repositories/automationsRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { updateDevice, getDeviceWithHub } from '../repositories/devicesRepository';
import { publishCommand } from '../services/mqttService';
import { recordDeviceActivity } from '../services/telemetryService';
import { triggerNodeRedFlow } from '../services/nodeRedService';

export async function listScenes(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const scenes = await getScenes(home.id);
    return successResponse(res, { scenes });
  } catch (error: any) {
    console.error('List scenes error:', error);
    return errorResponse(res, error.message || 'Failed to list scenes', 500);
  }
}

export async function createScene(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, icon, description, deviceStates, devices } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Scene name is required', 400);
    }

    const scene = await saveScene({
      home_id: home.id,
      name: name.trim(),
      icon: icon || 'sunset',
      description: description || '',
      device_states: sanitizeDeviceStates(deviceStates),
      devices: Array.isArray(devices) ? devices : [],
    });

    return successResponse(res, { message: 'Scene created successfully', scene }, 201);
  } catch (error: any) {
    console.error('Create scene error:', error);
    return errorResponse(res, error.message || 'Failed to create scene', 500);
  }
}

export async function updateScene(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, sceneId } = req.params;
    const { name, icon, description, deviceStates, devices } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const scene = await getSceneById(sceneId);
    if (!scene || scene.home_id !== home.id) {
      return errorResponse(res, 'Scene not found', 404);
    }

    await updateSceneRecord(sceneId, {
      name: name?.trim() || undefined,
      icon,
      description,
      device_states: deviceStates ? sanitizeDeviceStates(deviceStates) : undefined,
      devices: Array.isArray(devices) ? devices : undefined,
    });

    const updatedScene = await getSceneById(sceneId);
    return successResponse(res, {
      message: 'Scene updated successfully',
      scene: updatedScene,
    });
  } catch (error: any) {
    console.error('Update scene error:', error);
    return errorResponse(res, error.message || 'Failed to update scene', 500);
  }
}

export async function deleteScene(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, sceneId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const scene = await getSceneById(sceneId);
    if (!scene || scene.home_id !== home.id) {
      return errorResponse(res, 'Scene not found', 404);
    }

    await deleteSceneRecord(sceneId);

    return successResponse(res, {
      message: 'Scene deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete scene error:', error);
    return errorResponse(res, error.message || 'Failed to delete scene', 500);
  }
}

export async function activateScene(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, sceneId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const scene = await getSceneById(sceneId);
    if (!scene || scene.home_id !== home.id) {
      return errorResponse(res, 'Scene not found', 404);
    }

    await deactivateScenes(home.id);
    await setSceneActive(sceneId, home.id);

    const deviceStates = sanitizeDeviceStates(scene.device_states);
    await Promise.all(
      Object.entries(deviceStates).map(async ([deviceId, rawState]) => {
        const normalized = normalizeDeviceState(rawState as Record<string, unknown>);
        if (!normalized) return;

        const device = await getDeviceWithHub(deviceId);
        if (!device || device.home_id !== home.id) return;

        await updateDevice(deviceId, normalized.update);

        const mqttTopic = device.mqtt_topic || `hubs/${device.hub_id}`;
        if (normalized.command && mqttTopic) {
          publishCommand(`${mqttTopic}/devices/${deviceId}/control`, {
            ...normalized.command,
            sceneId,
          });
        }

        await recordDeviceActivity({
          homeId: home.id,
          roomId: device.room_id,
          deviceId,
          category: device.category,
          value: typeof normalized.update.value === 'number' ? normalized.update.value : undefined,
          isActive: typeof normalized.update.isActive === 'boolean' ? normalized.update.isActive : undefined,
          source: 'scene',
        });
      })
    );

    await notifySceneActivation(home.id, sceneId);

    return successResponse(res, {
      message: 'Scene activated successfully',
      sceneId,
    });
  } catch (error: any) {
    console.error('Activate scene error:', error);
    return errorResponse(res, error.message || 'Failed to activate scene', 500);
  }
}

function sanitizeDeviceStates(states: any) {
  if (!states || typeof states !== 'object') return {};
  return states;
}

function normalizeDeviceState(state: Record<string, unknown>) {
  if (!state) return null;
  const update: any = {};
  const command: any = {
    timestamp: new Date().toISOString(),
    source: 'scene',
  };
  let hasUpdate = false;

  if (typeof state.isActive === 'boolean') {
    update.isActive = state.isActive;
    command.action = state.isActive ? 'ON' : 'OFF';
    hasUpdate = true;
  }

  if (typeof state.value === 'number') {
    update.value = state.value;
    command.value = state.value;
    hasUpdate = true;
  }

  if (typeof state.unit === 'string') {
    update.unit = state.unit;
  }

  if (!hasUpdate) {
    return null;
  }

  return { update, command };
}

async function notifySceneActivation(homeId: string, sceneId: string) {
  try {
    await triggerNodeRedFlow({
      flow: 'scene.activation',
      data: { homeId, sceneId },
    });
  } catch (error) {
    console.error('Scene activation webhook failed', error);
  }
}
