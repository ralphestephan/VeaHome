import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function pairHub(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { qrCode, homeId } = req.body;

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Parse QR code (format: "VEAHUB-{serial_number}")
    const serialNumber = qrCode.replace('VEAHUB-', '');

    // Check if hub already exists
    const existingHub = await query(
      'SELECT id, mqtt_topic FROM hubs WHERE serial_number = $1',
      [serialNumber]
    );

    let hubId: string;
    let mqttTopic: string;

    if (existingHub.rows.length > 0) {
      // Hub already exists, update home_id
      hubId = existingHub.rows[0].id;
      mqttTopic = existingHub.rows[0].mqtt_topic || `hubs/${hubId}`;
      await query(
        'UPDATE hubs SET home_id = $1, status = $2 WHERE id = $3',
        [homeId, 'pairing', hubId]
      );
    } else {
      // Create new hub
      hubId = uuidv4();
      mqttTopic = `hubs/${hubId}`;
      await query(
        `INSERT INTO hubs (id, home_id, serial_number, status, mqtt_topic, name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [hubId, homeId, serialNumber, 'pairing', mqttTopic, `Hub ${serialNumber.slice(-4)}`]
      );
    }

    return successResponse(res, {
      hubId,
      status: 'pairing',
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const hubsResult = await query(
      'SELECT id, name, serial_number, status, wifi_ssid, wifi_connected FROM hubs WHERE home_id = $1',
      [homeId]
    );

    return successResponse(res, { hubs: hubsResult.rows });
  } catch (error: any) {
    console.error('List hubs error:', error);
    return errorResponse(res, error.message || 'Failed to list hubs', 500);
  }
}

export async function connectWifi(req: Request, res: Response) {
  try {
    const { hubId } = req.params;
    const { ssid, password } = req.body;

    // Get hub
    const hubResult = await query(
      'SELECT id, mqtt_topic FROM hubs WHERE id = $1',
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const hub = hubResult.rows[0];

    // TODO: Publish WiFi credentials to hub via MQTT
    // This will be implemented in the IoT service
    console.log(`Publishing WiFi config to ${hub.mqtt_topic}/wifi/config`);

    // Update hub in database
    await query(
      'UPDATE hubs SET wifi_ssid = $1, wifi_connected = false WHERE id = $2',
      [ssid, hubId]
    );

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
    const { hubId } = req.params;
    const { roomIds } = req.body;

    if (roomIds.length > 2) {
      return errorResponse(res, 'Maximum 2 rooms per hub', 400);
    }

    // Delete existing room assignments
    await query('DELETE FROM hub_rooms WHERE hub_id = $1', [hubId]);

    // Insert new room assignments
    if (roomIds.length > 0) {
      const values = roomIds.map((roomId: string, index: number) => 
        `($${index * 2 + 1}, $${index * 2 + 2})`
      ).join(', ');
      
      const params = roomIds.flatMap((roomId: string) => [hubId, roomId]);
      
      await query(
        `INSERT INTO hub_rooms (hub_id, room_id) VALUES ${values}`,
        params
      );
    }

    // Update hub status
    await query(
      'UPDATE hubs SET status = $1 WHERE id = $2',
      ['online', hubId]
    );

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
    const { hubId } = req.params;

    const hubResult = await query(
      'SELECT id, status, wifi_connected FROM hubs WHERE id = $1',
      [hubId]
    );

    if (hubResult.rows.length === 0) {
      return errorResponse(res, 'Hub not found', 404);
    }

    const hub = hubResult.rows[0];

    return successResponse(res, {
      status: hub.status,
      connected: hub.wifi_connected,
    });
  } catch (error: any) {
    console.error('Get hub status error:', error);
    return errorResponse(res, error.message || 'Failed to get hub status', 500);
  }
}
