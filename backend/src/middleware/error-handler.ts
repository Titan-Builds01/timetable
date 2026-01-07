import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../shared/types';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  const response: ApiResponse = {
    success: false,
    error: err.message || 'Internal server error',
  };

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(response);
}

