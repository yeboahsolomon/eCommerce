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
