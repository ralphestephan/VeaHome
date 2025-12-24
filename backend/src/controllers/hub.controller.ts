import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getHubById,
  getHubBySerial,
  createHub,
  assignHubToHome,
  getHubsByHomeId,
  updateHubWifi,
  assignRooms as assignRoomsRepo,
  updateHubStatus,
  updateHubTopic,
} from '../repositories/hubsRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { encryptSecret } from '../services/cryptoService';
import { publishCommand } from '../services/mqttService';

export async function pairHub(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { qrCode, homeId } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!qrCode || typeof qrCode !== 'string') {
      return errorResponse(res, 'Invalid QR code', 400);
    }

    const serialNumber = qrCode.replace('VEAHUB-', '').trim();
    if (!serialNumber) {
      return errorResponse(res, 'Invalid hub serial number', 400);
    }

    let hub = await getHubBySerial(serialNumber);
    if (hub) {
      await assignHubToHome(hub.id, home.id, 'pairing');
      hub = await getHubById(hub.id);
    } else {
      hub = await createHub({
        homeId: home.id,
        serialNumber,
        name: `Hub ${serialNumber.slice(-4)}`,
        status: 'pairing',
        ownerId: home.user_id,
      });
    }

    if (!hub) {
      return errorResponse(res, 'Failed to provision hub', 500);
    }

    let mqttTopic = hub.mqtt_topic || `hubs/${hub.id}`;
    if (!hub.mqtt_topic) {
      await updateHubTopic(hub.id, mqttTopic);
      hub.mqtt_topic = mqttTopic;
    }

    return successResponse(res, {
      hubId: hub.id,
      status: hub.status,
      mqttTopic,
    });
  } catch (error: any) {
    console.error('Pair hub error:', error);
    return errorResponse(res, error.message || 'Failed to pair hub', 500);
  }
}

export async function listHubs(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const hubs = await getHubsByHomeId(home.id);
    return successResponse(res, { hubs });
  } catch (error: any) {
    console.error('List hubs error:', error);
    return errorResponse(res, error.message || 'Failed to list hubs', 500);
  }
}

export async function createHubDirect(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, serialNumber, hubType, metadata, roomId } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const hub = await createHub({
      homeId: home.id,
      serialNumber: serialNumber || `HUB_${Date.now()}`,
      name: name || `Hub ${Date.now()}`,
      hubType: hubType || 'airguard',
      status: 'online',
      ownerId: home.user_id,
      metadata: metadata || {},
      roomId: roomId || null,
    });

    if (!hub) {
      return errorResponse(res, 'Failed to create hub', 500);
    }

    let mqttTopic = hub.mqtt_topic || `hubs/${hub.id}`;
    if (!hub.mqtt_topic) {
      await updateHubTopic(hub.id, mqttTopic);
      hub.mqtt_topic = mqttTopic;
    }

    return successResponse(res, { hub });
  } catch (error: any) {
    console.error('Create hub error:', error);
    return errorResponse(res, error.message || 'Failed to create hub', 500);
  }
}

export async function connectWifi(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { hubId } = req.params;
    const { ssid, password } = req.body;

    const hub = await getHubById(hubId);
    if (!hub) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const home = await ensureHomeAccess(res, hub.home_id, userId);
    if (!home) return;

    if (!ssid) {
      return errorResponse(res, 'WiFi SSID is required', 400);
    }

    const encryptedPassword = password ? encryptSecret(password) : null;
    await updateHubWifi(hub.id, ssid, encryptedPassword);

    let mqttTopic = hub.mqtt_topic || `hubs/${hub.id}`;
    if (!hub.mqtt_topic) {
      await updateHubTopic(hub.id, mqttTopic);
    }

    publishCommand(`${mqttTopic}/wifi/config`, {
      ssid,
      password,
    });

    return successResponse(res, {
      message: 'WiFi credentials sent to hub',
      status: 'connecting',
    });
  } catch (error: any) {
    console.error('Connect WiFi error:', error);
    return errorResponse(res, error.message || 'Failed to connect WiFi', 500);
  }
}

export async function assignRooms(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { hubId } = req.params;
    const roomIds = Array.isArray(req.body?.roomIds) ? req.body.roomIds : [];

    if (roomIds.length > 2) {
      return errorResponse(res, 'Maximum 2 rooms per hub', 400);
    }

    const hub = await getHubById(hubId);
    if (!hub) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const home = await ensureHomeAccess(res, hub.home_id, userId);
    if (!home) return;

    await assignRoomsRepo(hub.id, roomIds);
    await updateHubStatus(hub.id, 'online');

    return successResponse(res, {
      message: 'Rooms assigned successfully',
      hubId,
      roomIds,
    });
  } catch (error: any) {
    console.error('Assign rooms error:', error);
    return errorResponse(res, error.message || 'Failed to assign rooms', 500);
  }
}

export async function getHubStatus(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { hubId } = req.params;

    const hub = await getHubById(hubId);
    if (!hub) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const home = await ensureHomeAccess(res, hub.home_id, userId);
    if (!home) return;

    return successResponse(res, {
      status: hub.status,
      connected: hub.wifi_connected,
    });
  } catch (error: any) {
    console.error('Get hub status error:', error);
    return errorResponse(res, error.message || 'Failed to get hub status', 500);
  }
}
