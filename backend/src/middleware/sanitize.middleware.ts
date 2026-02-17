import { Request, Response, NextFunction } from 'express';

// ============================================================
// Input Sanitization Middleware
// Strips HTML tags and trims whitespace from all string fields
// in request body to prevent stored XSS attacks.
// ============================================================

/**
 * Strip HTML tags from a string value
 */
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (typeof value === 'string') {
      obj[key] = stripHtml(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (typeof value[i] === 'string') {
          value[i] = stripHtml(value[i] as string);
        } else if (value[i] !== null && typeof value[i] === 'object') {
          sanitizeObject(value[i] as Record<string, unknown>);
        }
      }
    }
  }
}

/**
 * Middleware: sanitize all string fields in req.body
 * Apply globally after body parsing, before route handlers.
 */
export function sanitizeBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}
