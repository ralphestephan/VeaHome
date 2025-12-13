import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getSchedules,
  saveSchedule,
  updateSchedule as updateScheduleRecord,
  deleteSchedule as deleteScheduleRecord,
  getScheduleById,
} from '../repositories/automationsRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { triggerNodeRedFlow } from '../services/nodeRedService';

export async function listSchedules(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const schedules = await getSchedules(home.id);
    return successResponse(res, { schedules });
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
    const { name, time, days, actions, enabled } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Schedule name is required', 400);
    }

    if (!time) {
      return errorResponse(res, 'Schedule time is required', 400);
    }

    const schedule = await saveSchedule({
      home_id: home.id,
      name: name.trim(),
      time,
      days: normalizeStringArray(days),
      actions: normalizeActions(actions),
      enabled: typeof enabled === 'boolean' ? enabled : true,
    });

    await notifyScheduleFlow('create', { homeId: home.id, schedule });

    return successResponse(res, {
      message: 'Schedule created successfully',
      schedule,
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
    const { name, time, days, actions, enabled } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const schedule = await getScheduleById(scheduleId);
    if (!schedule || schedule.home_id !== home.id) {
      return errorResponse(res, 'Schedule not found', 404);
    }

    await updateScheduleRecord(scheduleId, {
      name: name?.trim() || undefined,
      time,
      days: days ? normalizeStringArray(days) : undefined,
      actions: actions ? normalizeActions(actions) : undefined,
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
    });

    const updatedSchedule = await getScheduleById(scheduleId);
    await notifyScheduleFlow('update', { homeId: home.id, schedule: updatedSchedule });
    return successResponse(res, {
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
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

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const schedule = await getScheduleById(scheduleId);
    if (!schedule || schedule.home_id !== home.id) {
      return errorResponse(res, 'Schedule not found', 404);
    }

    await deleteScheduleRecord(scheduleId);

    await notifyScheduleFlow('delete', { homeId: home.id, scheduleId });

    return successResponse(res, {
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    return errorResponse(res, error.message || 'Failed to delete schedule', 500);
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function normalizeActions(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value;
}

async function notifyScheduleFlow(action: string, payload: Record<string, unknown>) {
  try {
    await triggerNodeRedFlow({
      flow: 'schedules.sync',
      data: { action, ...payload },
    });
  } catch (error) {
    console.error('Schedule flow notification failed', error);
  }
}
