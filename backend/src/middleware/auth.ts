import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken } from '../config/jwt';
import { errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return errorResponse(res, 'Unauthorized - No token provided', 401);
    }

    const payload = verifyToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch (error) {
    return errorResponse(res, 'Unauthorized - Invalid token', 401);
  }
}
