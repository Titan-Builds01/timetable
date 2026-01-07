import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../../shared/types';
import { ApiResponse } from '../../shared/types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      return res.status(401).json(response);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient permissions',
      };
      return res.status(403).json(response);
    }

    next();
  };
}

