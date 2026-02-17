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
        emailVerified: boolean;
        sellerProfile?: {
          id: string;
          isActive: boolean;
        } | null;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  emailVerified: boolean;
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
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      throw new ApiError(401, 'Authentication required. Please login.');
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true,
        emailVerified: true,
        sellerProfile: { select: { id: true, isActive: true } }
      }
    });
    
    if (!user) {
      throw new ApiError(401, 'User no longer exists.');
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      sellerProfile: user.sellerProfile,
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
 * Middleware to check if user has seller or admin role
 */
export function requireSellerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new ApiError(401, 'Authentication required.'));
    return;
  }
  
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SELLER') {
    next(new ApiError(403, 'Seller or Admin access required.'));
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
    let token;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true,
        emailVerified: true,
        sellerProfile: { select: { id: true, isActive: true } }
      }
    });
    
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        sellerProfile: user.sellerProfile,
      };
    }
    
    next();
  } catch {
    // Token invalid, continue without user
    next();
  }
}

// Alias for backward compatibility
export const authMiddleware = authenticate;
