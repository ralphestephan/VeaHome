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
  deleteHub as deleteHubRepo,
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

    console.log('[listHubs] Listing hubs for homeId:', homeId, 'userId:', userId);

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) {
      console.log('[listHubs] No home access or home not found');
      return;
    }

    console.log('[listHubs] Home found:', home.id, 'querying hubs...');
    const hubs = await getHubsByHomeId(home.id);
    console.log('[listHubs] Found', hubs.length, 'hubs for home', home.id);
    if (hubs.length > 0) {
      console.log('[listHubs] Hub IDs:', hubs.map(h => h.id).join(', '));
    }
    
    // Transform to camelCase for frontend
    const transformedHubs = hubs.map(h => ({
      id: h.id,
      homeId: h.home_id,
      serialNumber: h.serial_number,
      name: h.name || `Device_${h.serial_number}`,
      hubType: h.hub_type || 'utility',
      status: h.status,
      wifiSsid: h.wifi_ssid,
      wifiConnected: h.wifi_connected,
      mqttTopic: h.mqtt_topic,
      metadata: h.metadata,
      createdAt: h.created_at,
      updatedAt: h.updated_at
    }));
    
    return successResponse(res, { hubs: transformedHubs });
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

    console.log('[createHubDirect] Creating hub for homeId:', homeId, 'serial:', serialNumber);

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) {
      console.log('[createHubDirect] No home access or home not found');
      return;
    }

    console.log('[createHubDirect] Home found:', home.id, 'user:', home.user_id);

    // Check if hub already exists with this serial number
    const existingHub = serialNumber ? await getHubBySerial(serialNumber) : null;
    if (existingHub) {
      // Hub already exists, just return it
      console.log('[createHubDirect] Hub with serial number already exists:', existingHub.id, 'home:', existingHub.home_id);
      return successResponse(res, { hub: existingHub });
    }

    console.log('[createHubDirect] Creating new hub with homeId:', home.id);
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

export async function updateHub(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, hubId } = req.params;
    const { name, roomId } = req.body;

    console.log('[updateHub] Updating hub:', hubId, 'in home:', homeId, 'user:', userId, 'data:', { name, roomId });

    // Verify home access
    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) {
      console.log('[updateHub] No home access or home not found');
      return;
    }

    // Check if hub exists and belongs to this home
    const hub = await getHubById(hubId);
    if (!hub) {
      console.log('[updateHub] Hub not found:', hubId);
      return errorResponse(res, 'Hub not found', 404);
    }

    if (hub.home_id !== homeId) {
      console.log('[updateHub] Hub does not belong to this home. Hub home:', hub.home_id, 'requested home:', homeId);
      return errorResponse(res, 'Hub not found', 404);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (roomId !== undefined) {
      updates.push(`room_id = $${paramIndex++}`);
      values.push(roomId);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);
    values.push(hubId);

    // Execute update
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const query = `
      UPDATE hubs 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('[updateHub] Executing query:', query, 'with values:', values);
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const updatedHub = result.rows[0];
    console.log('[updateHub] Hub updated successfully:', updatedHub);

    return successResponse(res, updatedHub);
  } catch (error: any) {
    console.error('Update hub error:', error);
    return errorResponse(res, error.message || 'Failed to update hub', 500);
  }
}

export async function deleteHub(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, hubId } = req.params;

    console.log('[deleteHub] Deleting hub:', hubId, 'from home:', homeId, 'by user:', userId);

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) {
      console.log('[deleteHub] No home access or home not found');
      return;
    }

    // Check if hub exists and belongs to this home
    const hub = await getHubById(hubId);
    if (!hub) {
      console.log('[deleteHub] Hub not found:', hubId);
      return errorResponse(res, 'Hub not found', 404);
    }

    if (hub.home_id !== homeId) {
      console.log('[deleteHub] Hub does not belong to this home. Hub home:', hub.home_id, 'requested home:', homeId);
      return errorResponse(res, 'Hub not found', 404);
    }

    // Delete the hub
    await deleteHubRepo(hubId);
    console.log('[deleteHub] Hub deleted successfully:', hubId);

    return successResponse(res, { message: 'Hub deleted successfully' });
  } catch (error: any) {
    console.error('Delete hub error:', error);
    return errorResponse(res, error.message || 'Failed to delete hub', 500);
  }
}
