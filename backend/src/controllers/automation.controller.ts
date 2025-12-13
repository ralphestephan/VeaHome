import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getAutomations,
  saveAutomation,
  updateAutomation as updateAutomationRecord,
  deleteAutomation as deleteAutomationRecord,
  getAutomationById,
} from '../repositories/automationsRepository';
import { ensureHomeAccess } from './helpers/homeAccess';
import { triggerNodeRedFlow } from '../services/nodeRedService';

export async function listAutomations(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const automations = await getAutomations(home.id);
    return successResponse(res, { automations });
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
    const { name, trigger, actions, enabled } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Automation name is required', 400);
    }

    const automation = await saveAutomation({
      home_id: home.id,
      name: name.trim(),
      trigger: normalizeTrigger(trigger),
      actions: normalizeActions(actions),
      enabled: typeof enabled === 'boolean' ? enabled : true,
    });

    await notifyAutomationFlow('create', { homeId: home.id, automation });

    return successResponse(res, {
      message: 'Automation created successfully',
      automation,
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
    const { name, trigger, actions, enabled } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const automation = await getAutomationById(automationId);
    if (!automation || automation.home_id !== home.id) {
      return errorResponse(res, 'Automation not found', 404);
    }

    await updateAutomationRecord(automationId, {
      name: name?.trim() || undefined,
      trigger: trigger ? normalizeTrigger(trigger) : undefined,
      actions: actions ? normalizeActions(actions) : undefined,
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
    });

    const updatedAutomation = await getAutomationById(automationId);
    await notifyAutomationFlow('update', { homeId: home.id, automation: updatedAutomation });
    return successResponse(res, {
      message: 'Automation updated successfully',
      automation: updatedAutomation,
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

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const automation = await getAutomationById(automationId);
    if (!automation || automation.home_id !== home.id) {
      return errorResponse(res, 'Automation not found', 404);
    }

    await deleteAutomationRecord(automationId);

    await notifyAutomationFlow('delete', { homeId: home.id, automationId });

    return successResponse(res, {
      message: 'Automation deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete automation error:', error);
    return errorResponse(res, error.message || 'Failed to delete automation', 500);
  }
}

function normalizeTrigger(trigger: unknown) {
  if (!trigger || typeof trigger !== 'object') return {};
  return trigger;
}

function normalizeActions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value;
}

async function notifyAutomationFlow(action: string, payload: Record<string, unknown>) {
  try {
    await triggerNodeRedFlow({
      flow: 'automations.sync',
      data: { action, ...payload },
    });
  } catch (error) {
    console.error('Automation flow notification failed', error);
  }
}
