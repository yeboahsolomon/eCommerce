import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain text password with hashed password
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token
 */
/**
 * Generate JWT token
 */
export function generateToken(payload: {
  userId: string;
  email: string;
  roles: string[];
  emailVerified: boolean;
}): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string,
  } as jwt.SignOptions);
}

/**
 * Generate cryptographically secure refresh token (opaque string)
 */
export function generateRefreshToken(_payload: {
  userId: string;
}): string {
  return crypto.randomBytes(48).toString('hex'); // 96-char hex string
}

/**
 * Generate a secure token + its SHA-256 hash (for email verification / password reset)
 * Returns { token, hash } — send `token` to user, store `hash` in DB
 */
export function generateSecureToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex'); // 64-char hex
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate unique slug by appending a random suffix if needed
 */
export function generateUniqueSlug(text: string, existingSlug?: string): string {
  const baseSlug = generateSlug(text);
  
  if (!existingSlug || existingSlug !== baseSlug) {
    return baseSlug;
  }
  
  // Add random suffix
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${baseSlug}-${suffix}`;
}

/**
 * Format price for display (Ghana Cedi)
 */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `₵${numPrice.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}
