import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import {
  getHomesByUserId,
  createHome as createHomeRecord,
  getHomeById,
  updateHome as updateHomeRecord,
  updateHomeLayout as saveHomeLayout,
  deleteHome as deleteHomeRecord,
} from '../repositories/homesRepository';
import {
  getRoomsByHomeId,
  getRoomById,
  createRoom as createRoomRecord,
  updateRoom as updateRoomRecord,
  deleteRoom as deleteRoomRecord,
} from '../repositories/roomsRepository';
import { getDevicesByRoom } from '../repositories/devicesRepository';
import { getEnergyMetrics } from '../repositories/energyRepository';
import { ensureHomeAccess } from './helpers/homeAccess';

export async function listHomes(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const homes = await getHomesByUserId(userId);
    return successResponse(res, { homes });
  } catch (error: any) {
    console.error('List homes error:', error);
    return errorResponse(res, error.message || 'Failed to list homes', 500);
  }
}

export async function createHome(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { name } = req.body;

    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    if (!name || !name.trim()) {
      return errorResponse(res, 'Home name is required', 400);
    }

    const home = await createHomeRecord(userId, name.trim());
    return successResponse(
      res,
      {
        message: 'Home created successfully',
        home,
      },
      201
    );
  } catch (error: any) {
    console.error('Create home error:', error);
    return errorResponse(res, error.message || 'Failed to create home', 500);
  }
}

export async function getHome(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    return successResponse(res, { home });
  } catch (error: any) {
    console.error('Get home error:', error);
    return errorResponse(res, error.message || 'Failed to get home', 500);
  }
}

export async function updateHome(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, model3dUrl } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name && !model3dUrl) {
      return errorResponse(res, 'At least one field (name or model3dUrl) is required', 400);
    }

    const updated = await updateHomeRecord(home.id, { name, model3dUrl });
    return successResponse(res, { home: updated });
  } catch (error: any) {
    console.error('Update home error:', error);
    return errorResponse(res, error.message || 'Failed to update home', 500);
  }
}

export async function getRooms(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const rooms = await getRoomsByHomeId(home.id);
    const roomsWithDevices = await Promise.all(
      rooms.map(async (room) => ({
        ...room,
        devices: await getDevicesByRoom(room.id),
      }))
    );

    return successResponse(res, { rooms: roomsWithDevices });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    return errorResponse(res, error.message || 'Failed to get rooms', 500);
  }
}

export async function getRoom(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, roomId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const room = await getRoomById(roomId);
    if (!room || room.home_id !== home.id) {
      return errorResponse(res, 'Room not found', 404);
    }

    const devices = await getDevicesByRoom(room.id);
    return successResponse(res, { room: { ...room, devices } });
  } catch (error: any) {
    console.error('Get room error:', error);
    return errorResponse(res, error.message || 'Failed to get room', 500);
  }
}

export async function createRoomHandler(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { name, scene, image, layoutPath, accentColor, metadata } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Room name is required', 400);
    }

    const room = await createRoomRecord({
      homeId: home.id,
      name: name.trim(),
      scene,
      image,
      layoutPath,
      accentColor,
      metadata,
    });

    return successResponse(res, { room }, 201);
  } catch (error: any) {
    console.error('Create room error:', error);
    return errorResponse(res, error.message || 'Failed to create room', 500);
  }
}

export async function updateRoomHandler(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, roomId } = req.params;
    const updates = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const existingRoom = await getRoomById(roomId);
    if (!existingRoom || existingRoom.home_id !== home.id) {
      return errorResponse(res, 'Room not found', 404);
    }

    await updateRoomRecord(roomId, {
      name: updates.name,
      scene: updates.scene,
      image: updates.image,
      layoutPath: updates.layoutPath,
      accentColor: updates.accentColor,
      metadata: updates.metadata,
    });

    const updatedRoom = await getRoomById(roomId);
    return successResponse(res, { room: updatedRoom });
  } catch (error: any) {
    console.error('Update room error:', error);
    return errorResponse(res, error.message || 'Failed to update room', 500);
  }
}

export async function deleteRoomHandler(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, roomId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const existingRoom = await getRoomById(roomId);
    if (!existingRoom || existingRoom.home_id !== home.id) {
      return errorResponse(res, 'Room not found', 404);
    }

    await deleteRoomRecord(roomId);
    return successResponse(res, { message: 'Room deleted successfully' });
  } catch (error: any) {
    console.error('Delete room error:', error);
    return errorResponse(res, error.message || 'Failed to delete room', 500);
  }
}

export async function updateRoomLayout(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { layout } = req.body;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    await saveHomeLayout(home.id, layout);
    return successResponse(res, { message: 'Layout updated successfully', layout });
  } catch (error: any) {
    console.error('Update room layout error:', error);
    return errorResponse(res, error.message || 'Failed to update layout', 500);
  }
}

export async function getEnergy(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const range = (req.query.range as string) || 'day';

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    const { granularity, from, to } = resolveEnergyWindow(range);
    const metrics = await getEnergyMetrics(home.id, granularity, from, to);

    const energyData = metrics.length
      ? metrics.map(formatEnergyMetric)
      : generateMockEnergyData(range);

    return successResponse(res, {
      energyData,
      granularity,
      range,
      source: metrics.length ? 'timeseries' : 'mock',
    });
  } catch (error: any) {
    console.error('Get energy error:', error);
    return errorResponse(res, error.message || 'Failed to get energy data', 500);
  }
}

export async function getRoomEnergy(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) return;

    // TODO: Persist per-room metrics. Using mock data for now.
    const energyData = generateMockEnergyData('day');

    return successResponse(res, { energyData, source: 'mock' });
  } catch (error: any) {
    console.error('Get room energy error:', error);
    return errorResponse(res, error.message || 'Failed to get room energy', 500);
  }
}

export async function deleteHome(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;

    console.log('[DELETE HOME] Starting deletion process');
    console.log('[DELETE HOME] User ID:', userId);
    console.log('[DELETE HOME] Home ID:', homeId);

    const home = await ensureHomeAccess(res, homeId, userId);
    if (!home) {
      console.log('[DELETE HOME] Home access check failed');
      return;
    }

    console.log('[DELETE HOME] Home found:', home.name);
    console.log('[DELETE HOME] Owner ID:', home.owner_id);

    // Verify user is the owner
    if (home.owner_id !== userId) {
      console.log('[DELETE HOME] User is not the owner - access denied');
      return errorResponse(res, 'Only the home owner can delete the home', 403);
    }

    console.log('[DELETE HOME] Calling deleteHomeRecord...');
    await deleteHomeRecord(homeId);
    console.log('[DELETE HOME] Successfully deleted home');

    return successResponse(res, {
      message: 'Home deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE HOME] Error:', error);
    console.error('[DELETE HOME] Error stack:', error.stack);
    return errorResponse(res, error.message || 'Failed to delete home', 500);
  }
}

function resolveEnergyWindow(range: string) {
  const now = new Date();
  const from = new Date(now);
  let granularity: 'hour' | 'day' = 'hour';

  switch (range) {
    case 'week':
      from.setDate(from.getDate() - 6);
      granularity = 'day';
      break;
    case 'month':
      from.setDate(from.getDate() - 29);
      granularity = 'day';
      break;
    default:
      from.setHours(from.getHours() - 23);
  }

  return { granularity, from, to: now };
}

function formatEnergyMetric(row: any) {
  const totals = row.totals || {};
  return {
    time: row.bucket_start,
    total: Number(totals.total ?? totals.total_kwh ?? 0),
    lighting: Number(totals.lighting ?? 0),
    climate: Number(totals.climate ?? 0),
    media: Number(totals.media ?? 0),
    security: Number(totals.security ?? 0),
  };
}

function generateMockEnergyData(range: string = 'day') {
  const dataPoints = range === 'day' ? 24 : range === 'week' ? 7 : 30;
  const data = [];

  for (let i = 0; i < dataPoints; i++) {
    data.push({
      time: i,
      total: Math.random() * 5 + 2,
      lighting: Math.random() * 1.5 + 0.5,
      climate: Math.random() * 2 + 1,
      media: Math.random() * 1 + 0.3,
      security: Math.random() * 0.5 + 0.2,
    });
  }

  return data;
}
