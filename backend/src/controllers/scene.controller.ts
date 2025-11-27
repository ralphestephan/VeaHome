import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listScenes(req: Request, res: Response) {
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

    const scenesResult = await query(
      'SELECT * FROM scenes WHERE home_id = $1 ORDER BY created_at DESC',
      [homeId]
    );

    return successResponse(res, { scenes: scenesResult.rows });
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const sceneId = uuidv4();
    await query(
      `INSERT INTO scenes (id, home_id, name, icon, description, device_states, devices)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sceneId, homeId, name, icon || 'sunset', description || '', JSON.stringify(deviceStates), JSON.stringify(devices || [])]
    );

    return successResponse(res, {
      id: sceneId,
      message: 'Scene created successfully',
    }, 201);
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      `UPDATE scenes 
       SET name = $1, icon = $2, description = $3, device_states = $4, devices = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND home_id = $7`,
      [name, icon, description, JSON.stringify(deviceStates), JSON.stringify(devices), sceneId, homeId]
    );

    return successResponse(res, {
      message: 'Scene updated successfully',
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      'DELETE FROM scenes WHERE id = $1 AND home_id = $2',
      [sceneId, homeId]
    );

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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Get scene
    const sceneResult = await query(
      'SELECT * FROM scenes WHERE id = $1 AND home_id = $2',
      [sceneId, homeId]
    );

    if (sceneResult.rows.length === 0) {
      return errorResponse(res, 'Scene not found', 404);
    }

    const scene = sceneResult.rows[0];
    const deviceStates = scene.device_states;

    // Deactivate all other scenes
    await query(
      'UPDATE scenes SET is_active = false WHERE home_id = $1',
      [homeId]
    );

    // Activate this scene
    await query(
      'UPDATE scenes SET is_active = true WHERE id = $1',
      [sceneId]
    );

    // Apply device states
    for (const [deviceId, state] of Object.entries(deviceStates)) {
      const deviceState = state as any;
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (deviceState.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(deviceState.isActive);
      }

      if (deviceState.value !== undefined) {
        updateFields.push(`value = $${paramIndex++}`);
        updateValues.push(deviceState.value);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(deviceId);

        await query(
          `UPDATE devices SET ${updateFields.join(', ')} WHERE id = $${paramIndex++}`,
          updateValues
        );

        // TODO: Emit WebSocket event for device update
        console.log(`Device ${deviceId} updated by scene activation`);
      }
    }

    return successResponse(res, {
      message: 'Scene activated successfully',
      sceneId,
    });
  } catch (error: any) {
    console.error('Activate scene error:', error);
    return errorResponse(res, error.message || 'Failed to activate scene', 500);
  }
}
