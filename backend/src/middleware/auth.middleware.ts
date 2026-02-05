import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../config/database.js';
import { ApiError } from './error.middleware.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Middleware to authenticate JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please provide a valid token.');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Invalid authorization header format.');
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      throw new ApiError(401, 'User no longer exists.');
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid or expired token.'));
    } else {
      next(error);
    }
  }
}

/**
 * Middleware to check if user has admin role
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required.'));
    return;
  }
  
  if (req.user.role !== 'ADMIN') {
    next(new ApiError(403, 'Admin access required.'));
    return;
  }
  
  next();
}

/**
 * Optional authentication - attaches user if token valid, continues otherwise
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });
    
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
    
    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
}
