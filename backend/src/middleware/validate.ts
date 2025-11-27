import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { errorResponse } from '../utils/response';

export function validate(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    
    next();
  };
}
