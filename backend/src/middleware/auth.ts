import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { ApiResponse } from '../../shared/types';
import { User } from '../../shared/types';

export interface AuthRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication token required',
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as any,
      name: '', // Will be fetched from DB if needed
      created_at: '',
      updated_at: '',
    };
    
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token',
    };
    return res.status(403).json(response);
  }
}

