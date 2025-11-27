import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listDevices(req: Request, res: Response) {
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

    const devicesResult = await query(
      `SELECT id, hub_id, home_id, room_id, name, type, category, 
              is_active, value, unit, signal_mappings 
       FROM devices WHERE home_id = $1 ORDER BY created_at ASC`,
      [homeId]
    );

    return successResponse(res, { devices: devicesResult.rows });
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
    const { name, type, category, roomId, hubId } = req.body;

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Verify hub exists
    const hubCheck = await query(
      'SELECT id FROM hubs WHERE id = $1 AND home_id = $2',
      [hubId, homeId]
    );

    if (hubCheck.rows.length === 0) {
      return errorResponse(res, 'Hub not found', 404);
    }

    // Create device
    const deviceId = uuidv4();
    await query(
      `INSERT INTO devices (id, hub_id, home_id, room_id, name, type, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [deviceId, hubId, homeId, roomId, name, type, category]
    );

    return successResponse(res, {
      id: deviceId,
      deviceId: deviceId,
      message: 'Device added successfully',
    }, 201);
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const deviceResult = await query(
      'SELECT * FROM devices WHERE id = $1 AND home_id = $2',
      [deviceId, homeId]
    );

    if (deviceResult.rows.length === 0) {
      return errorResponse(res, 'Device not found', 404);
    }

    return successResponse(res, { device: deviceResult.rows[0] });
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Get device and hub info
    const deviceResult = await query(
      `SELECT d.*, h.mqtt_topic 
       FROM devices d 
       JOIN hubs h ON d.hub_id = h.id 
       WHERE d.id = $1 AND d.home_id = $2`,
      [deviceId, homeId]
    );

    if (deviceResult.rows.length === 0) {
      return errorResponse(res, 'Device not found', 404);
    }

    const device = deviceResult.rows[0];

    // Build MQTT command
    const command: any = {
      deviceId,
      timestamp: new Date().toISOString(),
    };

    if (controlPayload.isActive !== undefined) {
      command.action = controlPayload.isActive ? 'ON' : 'OFF';
      command.signal = device.signal_mappings?.[command.action];
    }

    if (controlPayload.value !== undefined) {
      command.value = controlPayload.value;
      if (device.type === 'thermostat' || device.type === 'ac') {
        command.action = controlPayload.value > (device.value || 0) ? 'TEMP_UP' : 'TEMP_DOWN';
        command.signal = device.signal_mappings?.[command.action];
      }
    }

    // TODO: Publish command to hub via MQTT
    console.log(`Publishing command to ${device.mqtt_topic}/devices/${deviceId}/control:`, command);

    // Update device state in database
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (controlPayload.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(controlPayload.isActive);
    }

    if (controlPayload.value !== undefined) {
      updateFields.push(`value = $${paramIndex++}`);
      updateValues.push(controlPayload.value);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(deviceId, homeId);

      await query(
        `UPDATE devices 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex++} AND home_id = $${paramIndex++}`,
        updateValues
      );
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
    const { hubId, deviceId } = req.params;
    const { action } = req.body;

    // Get hub and device
    const deviceResult = await query(
      `SELECT d.*, h.mqtt_topic 
       FROM devices d 
       JOIN hubs h ON d.hub_id = h.id 
       WHERE d.id = $1 AND h.id = $2`,
      [deviceId, hubId]
    );

    if (deviceResult.rows.length === 0) {
      return errorResponse(res, 'Device not found', 404);
    }

    const device = deviceResult.rows[0];

    // TODO: Publish learn command to hub via MQTT
    console.log(`Publishing learn command to ${device.mqtt_topic}/devices/${deviceId}/learn:`, { action });

    // Simulate signal learning (in real scenario, hub will report back the learned signal)
    const learnedSignal = `SIGNAL_${action}_${Date.now()}`;
    
    // Update signal mappings
    const signalMappings = device.signal_mappings || {};
    signalMappings[action] = learnedSignal;

    await query(
      'UPDATE devices SET signal_mappings = $1 WHERE id = $2',
      [JSON.stringify(signalMappings), deviceId]
    );

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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
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
