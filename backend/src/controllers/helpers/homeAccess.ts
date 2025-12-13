import { Response } from 'express';
import { errorResponse } from '../../utils/response';
import { getHomeById } from '../../repositories/homesRepository';

export async function ensureHomeAccess(res: Response, homeId: string, userId?: string) {
  if (!userId) {
    errorResponse(res, 'Unauthorized', 401);
    return null;
  }

  const home = await getHomeById(homeId);
  if (!home || home.user_id !== userId) {
    errorResponse(res, 'Access denied', 403);
    return null;
  }

  return home;
}
