import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listAutomations(req: Request, res: Response) {
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

    const automationsResult = await query(
      'SELECT * FROM automations WHERE home_id = $1 ORDER BY created_at DESC',
      [homeId]
    );

    return successResponse(res, { automations: automationsResult.rows });
  } catch (error: any) {
    console.error('List automations error:', error);
    return errorResponse(res, error.message || 'Failed to list automations', 500);
  }
}

export async function createAutomation(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, trigger, actions } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const automationId = uuidv4();
    await query(
      `INSERT INTO automations (id, home_id, name, trigger, actions)
       VALUES ($1, $2, $3, $4, $5)`,
      [automationId, homeId, name, JSON.stringify(trigger), JSON.stringify(actions)]
    );

    return successResponse(res, {
      id: automationId,
      message: 'Automation created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Create automation error:', error);
    return errorResponse(res, error.message || 'Failed to create automation', 500);
  }
}

export async function updateAutomation(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, automationId } = req.params;
    const { name, trigger, actions } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      `UPDATE automations 
       SET name = $1, trigger = $2, actions = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND home_id = $5`,
      [name, JSON.stringify(trigger), JSON.stringify(actions), automationId, homeId]
    );

    return successResponse(res, {
      message: 'Automation updated successfully',
    });
  } catch (error: any) {
    console.error('Update automation error:', error);
    return errorResponse(res, error.message || 'Failed to update automation', 500);
  }
}

export async function deleteAutomation(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, automationId } = req.params;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      'DELETE FROM automations WHERE id = $1 AND home_id = $2',
      [automationId, homeId]
    );

    return successResponse(res, {
      message: 'Automation deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete automation error:', error);
    return errorResponse(res, error.message || 'Failed to delete automation', 500);
  }
}
