import { Response } from 'express';

export function successResponse(res: Response, data: any, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function errorResponse(res: Response, message: string, statusCode: number = 500, errors?: any) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    errors,
  });
}
