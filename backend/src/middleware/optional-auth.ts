import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { AuthRequest } from './auth';
import { User } from '../../shared/types';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present and valid, but doesn't require it
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // No token provided - continue without user
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as JWTPayload;
    
    // Attach user info to request if token is valid
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
    // Invalid token - continue without user (don't fail the request)
    next();
  }
}


