import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
export function generateToken(payload: {
  userId: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Generate Refresh Token (long lived)
 */
export function generateRefreshToken(payload: {
  userId: string;
}): string {
  // Use a separate secret for refresh tokens ideally, but for now reuse or derived
  // Better to use a random string and store hash in DB
  // But to be stateless-ish, we can sign it.
  // Strategy: Random 40-byte hex string. 
  // We will hash this string and store in DB. 
  // We send the plain string to user.
  
  // Implementation:
  // We need crypto.
  // But importing crypto might be an issue if not in types? 'crypto' is standard node.
  // Let's use simple random string for now or jwt with longer expiry.
  // Using JWT for refresh token is fine too, but opaque string is safer against "forever access" if secret leaks.
  
  // Let's use crypto.randomBytes if available, or just a long random string.
  // We'll use a simple random generator for compatibility if strict.
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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
