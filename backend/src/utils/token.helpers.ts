import crypto from 'crypto'; // Needed for hashing the refresh token

/**
 * Hash a refresh token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
