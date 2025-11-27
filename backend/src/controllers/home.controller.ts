import { Request, Response } from 'express';
import { query } from '../config/database';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function listHomes(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    const homesResult = await query(
      'SELECT id, name, model3d_url, layout FROM homes WHERE user_id = $1',
      [userId]
    );

    return successResponse(res, { homes: homesResult.rows });
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

    const homeId = uuidv4();
    await query(
      'INSERT INTO homes (id, user_id, name) VALUES ($1, $2, $3)',
      [homeId, userId, name]
    );

    return successResponse(res, {
      id: homeId,
      name,
      message: 'Home created successfully',
    }, 201);
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

    const homeResult = await query(
      'SELECT * FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeResult.rows.length === 0) {
      return errorResponse(res, 'Home not found', 404);
    }

    return successResponse(res, { home: homeResult.rows[0] });
  } catch (error: any) {
    console.error('Get home error:', error);
    return errorResponse(res, error.message || 'Failed to get home', 500);
  }
}

export async function getRooms(req: Request, res: Response) {
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

    const roomsResult = await query(
      'SELECT * FROM rooms WHERE home_id = $1 ORDER BY created_at ASC',
      [homeId]
    );

    // Get devices for each room
    const rooms = await Promise.all(
      roomsResult.rows.map(async (room: any) => {
        const devicesResult = await query(
          'SELECT id, name, type, category, is_active, value FROM devices WHERE room_id = $1',
          [room.id]
        );
        return { ...room, devices: devicesResult.rows };
      })
    );

    return successResponse(res, { rooms });
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

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    const roomResult = await query(
      'SELECT * FROM rooms WHERE id = $1 AND home_id = $2',
      [roomId, homeId]
    );

    if (roomResult.rows.length === 0) {
      return errorResponse(res, 'Room not found', 404);
    }

    const room = roomResult.rows[0];

    // Get devices in room
    const devicesResult = await query(
      'SELECT * FROM devices WHERE room_id = $1',
      [roomId]
    );

    room.devices = devicesResult.rows;

    return successResponse(res, { room });
  } catch (error: any) {
    console.error('Get room error:', error);
    return errorResponse(res, error.message || 'Failed to get room', 500);
  }
}

export async function updateRoomLayout(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId } = req.params;
    const { layout } = req.body;

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    await query(
      'UPDATE homes SET layout = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(layout), homeId]
    );

    return successResponse(res, {
      message: 'Layout updated successfully',
      layout,
    });
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
    const energyData = generateMockEnergyData(range as string);

    return successResponse(res, { energyData });
  } catch (error: any) {
    console.error('Get energy error:', error);
    return errorResponse(res, error.message || 'Failed to get energy data', 500);
  }
}

export async function getRoomEnergy(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { homeId, roomId } = req.params;

    // Verify user owns the home
    const homeCheck = await query(
      'SELECT id FROM homes WHERE id = $1 AND user_id = $2',
      [homeId, userId]
    );

    if (homeCheck.rows.length === 0) {
      return errorResponse(res, 'Access denied', 403);
    }

    // TODO: Query room-specific energy data
    const energyData = generateMockEnergyData('day');

    return successResponse(res, { energyData });
  } catch (error: any) {
    console.error('Get room energy error:', error);
    return errorResponse(res, error.message || 'Failed to get room energy data', 500);
  }
}

// Helper function to generate mock energy data
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
