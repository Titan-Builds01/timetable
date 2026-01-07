import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../shared/types';

export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid ${paramName}: must be a valid UUID`,
      };
      return res.status(400).json(response);
    }

    next();
  };
}

export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
      };
      return res.status(400).json(response);
    }

    next();
  };
}

