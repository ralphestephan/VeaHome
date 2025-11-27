import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400);
  }

  if (err.name === 'UnauthorizedError') {
    return errorResponse(res, 'Unauthorized', 401);
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return errorResponse(res, 'Record already exists', 409);
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return errorResponse(res, 'Referenced record does not exist', 404);
  }

  return errorResponse(res, err.message || 'Internal server error', err.statusCode || 500);
}
