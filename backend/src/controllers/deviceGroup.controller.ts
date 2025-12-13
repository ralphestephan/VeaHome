import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getDeviceGroups,
  createDeviceGroupRecord,
  updateDeviceGroupRecord,
  deleteDeviceGroupRecord,
  getDeviceGroupById,
} from '../repositories/deviceGroupsRepository';
import { ensureHomeAccess } from './helpers/homeAccess';

export async function listDeviceGroups(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const groups = await getDeviceGroups(home.id);
    return successResponse(res, { groups });
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

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Group name is required', 400);
    }

    const devices = normalizeDeviceIds(deviceIds);

    const group = await createDeviceGroupRecord({
      homeId: home.id,
      name: name.trim(),
      deviceIds: devices,
    });

    return successResponse(res, {
      message: 'Device group created successfully',
      group,
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

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const group = await getDeviceGroupById(groupId);
    if (!group || group.home_id !== home.id) {
      return errorResponse(res, 'Group not found', 404);
    }

    await updateDeviceGroupRecord(groupId, {
      name: name?.trim() || undefined,
      deviceIds: deviceIds ? normalizeDeviceIds(deviceIds) : undefined,
    });

    const updatedGroup = await getDeviceGroupById(groupId);
    return successResponse(res, {
      message: 'Device group updated successfully',
      group: updatedGroup,
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

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const group = await getDeviceGroupById(groupId);
    if (!group || group.home_id !== home.id) {
      return errorResponse(res, 'Group not found', 404);
    }

    await deleteDeviceGroupRecord(groupId);

    return successResponse(res, {
      message: 'Device group deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete device group error:', error);
    return errorResponse(res, error.message || 'Failed to delete device group', 500);
  }
}

function normalizeDeviceIds(deviceIds: unknown): string[] {
  if (!Array.isArray(deviceIds)) return [];
  return deviceIds.map((id) => String(id));
}
