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
import { updateDevice, getDeviceWithHub, getDevicesByHomeId } from '../repositories/devicesRepository';
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
    const { name, icon, description, deviceStates, devices, scope, roomIds, deviceTypeRules } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Scene name is required', 400);
    }

    // Support both old format (deviceStates) and new format (deviceTypeRules)
    const sceneData: any = {
      home_id: home.id,
      name: name.trim(),
      icon: icon || 'sunset',
      description: description || '',
    };

    if (deviceTypeRules && Array.isArray(deviceTypeRules)) {
      // New hierarchical format
      sceneData.scope = scope || 'home';
      sceneData.room_ids = scope === 'rooms' && Array.isArray(roomIds) ? roomIds : null;
      sceneData.device_type_rules = deviceTypeRules;
      sceneData.device_states = {}; // Keep for backwards compatibility
      sceneData.devices = [];
    } else {
      // Old format - backwards compatibility
      sceneData.device_states = sanitizeDeviceStates(deviceStates);
      sceneData.devices = Array.isArray(devices) ? devices : [];
      sceneData.scope = 'home';
      sceneData.room_ids = null;
      sceneData.device_type_rules = [];
    }

    const scene = await saveScene(sceneData);

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
    const { name, icon, description, deviceStates, devices, scope, roomIds, deviceTypeRules } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const scene = await getSceneById(sceneId);
    if (!scene || scene.home_id !== home.id) {
      return errorResponse(res, 'Scene not found', 404);
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;

    // Support both old and new formats
    if (deviceTypeRules !== undefined) {
      updates.device_type_rules = deviceTypeRules;
      updates.scope = scope || 'home';
      updates.room_ids = scope === 'rooms' && Array.isArray(roomIds) ? roomIds : null;
    } else if (deviceStates !== undefined) {
      updates.device_states = sanitizeDeviceStates(deviceStates);
      if (devices !== undefined) updates.devices = Array.isArray(devices) ? devices : [];
    }

    await updateSceneRecord(sceneId, updates);

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

export async function deactivateScene(req: Request, res: Response) {
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

    return successResponse(res, {
      message: 'Scene deactivated successfully',
      sceneId,
    });
  } catch (error: any) {
    console.error('Deactivate scene error:', error);
    return errorResponse(res, error.message || 'Failed to deactivate scene', 500);
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

    // Check if scene uses new hierarchical format
    const deviceTypeRules = scene.device_type_rules || [];
    
    if (deviceTypeRules.length > 0) {
      // New format: apply rules based on device types and scope
      // Get both regular devices and hubs (hubs can be airguard devices)
      const allDevices = await getDevicesByHomeId(home.id);
      const { getHubsByHomeId } = await import('../repositories/hubsRepository');
      const allHubs = await getHubsByHomeId(home.id);
      
      // Map hubs to device format for processing
      const hubDevices = allHubs.map((h: any) => {
        // Parse metadata if it's a string
        let metadata = h.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            metadata = {};
          }
        }
        
        // Parse signal_mappings if it exists
        let signalMappings = h.signal_mappings || metadata;
        if (typeof signalMappings === 'string') {
          try {
            signalMappings = JSON.parse(signalMappings);
          } catch (e) {
            signalMappings = metadata;
          }
        }
        
        return {
          id: h.id,
          type: (h.hub_type === 'airguard' || h.hubType === 'airguard') ? 'airguard' : (h.hub_type || 'airguard'),
          room_id: h.room_id,
          home_id: h.home_id,
          metadata: metadata || {},
          signal_mappings: signalMappings || metadata || {},
          mqtt_topic: h.mqtt_topic,
          hub_id: h.id,
          serial_number: h.serial_number,
        };
      });
      
      // Combine devices and hubs
      const allDevicesIncludingHubs = [...allDevices, ...hubDevices];
      const targetDevices = resolveTargetDevices(allDevicesIncludingHubs, scene);

      await Promise.all(
        deviceTypeRules.map(async (rule: any) => {
          const devicesToControl = targetDevices.filter((d: any) => d.type === rule.type);
          
          // If specific mode, filter to only selected devices
          let finalDevicesToControl = devicesToControl;
          if (rule.mode === 'specific' && rule.deviceIds && rule.deviceIds.length > 0) {
            const selectedIds = new Set(rule.deviceIds);
            finalDevicesToControl = devicesToControl.filter((d: any) => selectedIds.has(d.id));
          }

          await Promise.all(
            finalDevicesToControl.map((device: any) =>
              applyStateToDevice(device, rule.state, home.id, sceneId)
            )
          );
        })
      );
    } else {
      // Old format: apply device_states directly
      const deviceStates = sanitizeDeviceStates(scene.device_states);
      await Promise.all(
        Object.entries(deviceStates).map(async ([deviceId, rawState]) => {
          const normalized = normalizeDeviceState(rawState as Record<string, unknown>);
          if (!normalized) return;

          const device = await getDeviceWithHub(deviceId);
          if (!device || device.home_id !== home.id) return;

          await applyStateToDevice(device, normalized.update, home.id, sceneId, normalized.command);
        })
      );
    }

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

// Resolve which devices should be controlled based on scene scope and room selection
function resolveTargetDevices(allDevices: any[], scene: any) {
  const scope = scene.scope || 'home';
  
  if (scope === 'home') {
    // Home-wide: all devices
    return allDevices;
  } else if (scope === 'rooms') {
    // Room-specific: only devices in selected rooms
    const roomIds = scene.room_ids || [];
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return allDevices; // Fallback to all if no rooms specified
    }
    const roomIdSet = new Set(roomIds.map(String));
    return allDevices.filter(d => d.room_id && roomIdSet.has(String(d.room_id)));
  }
  
  return allDevices;
}

// Apply state to a single device
async function applyStateToDevice(device: any, state: any, homeId: string, sceneId: string, existingCommand?: any) {
  const normalized = existingCommand ? { update: state, command: existingCommand } : normalizeDeviceState(state);
  if (!normalized) return;

  await updateDevice(device.id, normalized.update);

  // Handle AirGuard buzzer control via MQTT
  const isAirguard = device.type === 'airguard' || 
                     (device as any).hub_type === 'airguard' ||
                     (device as any).hubType === 'airguard';
  
  if (isAirguard && normalized.command.action?.startsWith('BUZZER_')) {
    const metadata = device.metadata as any || {};
    const signalMappings = device.signal_mappings as any || {};
    
    // Try multiple ways to get smartMonitorId
    let smartMonitorId = metadata?.smartMonitorId || 
                        signalMappings?.smartMonitorId || 
                        signalMappings?.smartmonitorId ||
                        metadata?.smartmonitorId;
    
    // If still not found, try to extract from serial number (e.g., "SM_1" -> 1)
    if (!smartMonitorId && (device as any).serial_number) {
      const match = String((device as any).serial_number).match(/SM[_-]?(\d+)/i);
      if (match) {
        smartMonitorId = match[1];
      }
    }
    
    // If still not found, try device ID as fallback (if it's numeric)
    if (!smartMonitorId && /^\d+$/.test(String(device.id))) {
      smartMonitorId = device.id;
    }
    
    // Last resort: try to get from hub metadata if device is a hub
    if (!smartMonitorId && (device as any).hub_id === device.id) {
      // This is a hub device, try to get from hub metadata
      const { getHubById } = await import('../repositories/hubsRepository');
      try {
        const hub = await getHubById(device.id);
        if (hub) {
          const hubMetadata = typeof hub.metadata === 'string' ? JSON.parse(hub.metadata) : (hub.metadata || {});
          smartMonitorId = hubMetadata?.smartMonitorId || hubMetadata?.smartmonitorId;
        }
      } catch (e) {
        console.warn(`[Scene] Error fetching hub for buzzer control:`, e);
      }
    }
    
    if (!smartMonitorId) {
      console.warn(`[Scene] No smartMonitorId found for AirGuard device ${device.id}. Metadata:`, metadata, 'SignalMappings:', signalMappings, 'Serial:', (device as any).serial_number);
      // Still try to publish with device ID as fallback
      smartMonitorId = device.id;
    }
    
    const buzzerState = normalized.command.action === 'BUZZER_ON' ? 'ON' : 'OFF';
    const topic = `vealive/smartmonitor/${smartMonitorId}/command/buzzer`;
    publishCommand(topic, { state: buzzerState });
    console.log(`[Scene] Published buzzer command to ${topic}: ${buzzerState} for device ${device.id} (smartMonitorId: ${smartMonitorId})`);
  } else {
    // Regular device MQTT control
    const mqttTopic = device.mqtt_topic || `hubs/${device.hub_id}`;
    if (normalized.command && mqttTopic) {
      publishCommand(`${mqttTopic}/devices/${device.id}/control`, {
        ...normalized.command,
        sceneId,
      });
    }
  }

  await recordDeviceActivity({
    homeId,
    roomId: device.room_id,
    deviceId: device.id,
    category: device.category,
    value: typeof normalized.update.value === 'number' ? normalized.update.value : undefined,
    isActive: typeof normalized.update.isActive === 'boolean' ? normalized.update.isActive : undefined,
    source: 'scene',
  });
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

  // Handle AirGuard buzzer control
  if (typeof state.buzzer === 'boolean') {
    update.buzzer = state.buzzer;
    command.action = state.buzzer ? 'BUZZER_ON' : 'BUZZER_OFF';
    command.buzzer = state.buzzer;
    hasUpdate = true;
  }

  // Handle regular device on/off
  if (typeof state.isActive === 'boolean') {
    update.isActive = state.isActive;
    command.action = state.isActive ? 'ON' : 'OFF';
    hasUpdate = true;
  }

  // Handle device value (brightness, temperature, etc.)
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
