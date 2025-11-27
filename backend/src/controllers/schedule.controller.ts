import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listSchedules(req: Request, res: Response) {
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

    const schedulesResult = await query(
      'SELECT * FROM schedules WHERE home_id = $1 ORDER BY time ASC',
      [homeId]
    );

    return successResponse(res, { schedules: schedulesResult.rows });
  } catch (error: any) {
    console.error('List schedules error:', error);
    return errorResponse(res, error.message || 'Failed to list schedules', 500);
  }
}

export async function createSchedule(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, time, days, actions } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const scheduleId = uuidv4();
    await query(
      `INSERT INTO schedules (id, home_id, name, time, days, actions)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [scheduleId, homeId, name, time, JSON.stringify(days), JSON.stringify(actions)]
    );

    return successResponse(res, {
      id: scheduleId,
      message: 'Schedule created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Create schedule error:', error);
    return errorResponse(res, error.message || 'Failed to create schedule', 500);
  }
}

export async function updateSchedule(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, scheduleId } = req.params;
    const { name, time, days, actions } = req.body;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      `UPDATE schedules 
       SET name = $1, time = $2, days = $3, actions = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND home_id = $6`,
      [name, time, JSON.stringify(days), JSON.stringify(actions), scheduleId, homeId]
    );

    return successResponse(res, {
      message: 'Schedule updated successfully',
    });
  } catch (error: any) {
    console.error('Update schedule error:', error);
    return errorResponse(res, error.message || 'Failed to update schedule', 500);
  }
}

export async function deleteSchedule(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, scheduleId } = req.params;

    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      'DELETE FROM schedules WHERE id = $1 AND home_id = $2',
      [scheduleId, homeId]
    );

    return successResponse(res, {
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    return errorResponse(res, error.message || 'Failed to delete schedule', 500);
  }
}
