import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listDeviceGroups(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const groupsResult = await query(
      'SELECT * FROM device_groups WHERE home_id = $1 ORDER BY created_at DESC',
      [homeId]
    );

    return successResponse(res, { groups: groupsResult.rows });
  } catch (error: any) {
    console.error('List device groups error:', error);
    return errorResponse(res, error.message || 'Failed to list device groups', 500);
  }
}

export async function createDeviceGroup(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, deviceIds } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const groupId = uuidv4();
    await query(
      `INSERT INTO device_groups (id, home_id, name, device_ids)
       VALUES ($1, $2, $3, $4)`,
      [groupId, homeId, name, JSON.stringify(deviceIds)]
    );

    return successResponse(res, {
      id: groupId,
      message: 'Device group created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Create device group error:', error);
    return errorResponse(res, error.message || 'Failed to create device group', 500);
  }
}

export async function updateDeviceGroup(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, groupId } = req.params;
    const { name, deviceIds } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      `UPDATE device_groups 
       SET name = $1, device_ids = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND home_id = $4`,
      [name, JSON.stringify(deviceIds), groupId, homeId]
    );

    return successResponse(res, {
      message: 'Device group updated successfully',
    });
  } catch (error: any) {
    console.error('Update device group error:', error);
    return errorResponse(res, error.message || 'Failed to update device group', 500);
  }
}

export async function deleteDeviceGroup(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, groupId } = req.params;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      'DELETE FROM device_groups WHERE id = $1 AND home_id = $2',
      [groupId, homeId]
    );

    return successResponse(res, {
      message: 'Device group deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete device group error:', error);
    return errorResponse(res, error.message || 'Failed to delete device group', 500);
  }
}
