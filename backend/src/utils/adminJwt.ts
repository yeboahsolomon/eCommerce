import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: 'superadmin';
}

const getSecret = (): string => {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    if (config.nodeEnv === 'production') {
      throw new Error('ADMIN_JWT_SECRET environment variable is not defined');
    }
    return 'fallback_dev_admin_secret'; // Fallback for dev ONLY
  }
  return secret;
};

export const signAdminToken = (payload: AdminTokenPayload): string => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: '8h', // Expiry: 8 hours as requested
  });
};

export const verifyAdminToken = (token: string): AdminTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, getSecret()) as AdminTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const refreshAdminToken = (token: string): string | null => {
  const decoded = verifyAdminToken(token);
  if (!decoded) return null;

  // Re-sign with the same payload to reset the 8h expiration
  return signAdminToken({
    adminId: decoded.adminId,
    email: decoded.email,
    role: decoded.role,
  });
};
