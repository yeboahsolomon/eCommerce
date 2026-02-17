import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponseHandler } from '../utils/response.js';

// ============================================================
// Base Error Class
// ============================================================

/**
 * Base API Error — all custom errors extend this.
 * Can still be used directly: `new ApiError(500, 'Something broke')`
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode: string;
  
  constructor(statusCode: number, message: string, isOperational = true, errorCode = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    
    // Preserve proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================
// Semantic Error Subclasses
// ============================================================

/**
 * 400 — Invalid input data, failed schema validation, bad request params
 */
export class ValidationError extends ApiError {
  public details?: Array<{ field: string; message: string }>;

  constructor(message = 'Validation failed.', details?: Array<{ field: string; message: string }>) {
    super(400, message, true, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 401 — Authentication failure (missing/invalid/expired token, wrong credentials)
 */
export class AuthError extends ApiError {
  constructor(message = 'Authentication required. Please login.') {
    super(401, message, true, 'AUTH_ERROR');
  }
}

/**
 * 403 — Authenticated but insufficient permissions
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, message, true, 'FORBIDDEN');
  }
}

/**
 * 404 — Resource not found
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found.`, true, 'NOT_FOUND');
  }
}

/**
 * 409 — Conflict (duplicate record, already exists)
 */
export class ConflictError extends ApiError {
  constructor(message = 'A record with this value already exists.') {
    super(409, message, true, 'CONFLICT');
  }
}

/**
 * 429 — Too many requests
 */
export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(429, message, true, 'RATE_LIMIT');
  }
}

// ============================================================
// 404 Route Handler (no matching route)
// ============================================================

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route: ${req.method} ${req.originalUrl}`);
  next(error);
}

// ============================================================
// Centralized Error Handler
// ============================================================

export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let details: unknown = undefined;
  let stack: string | undefined;

  // ------ Custom ApiError (and subclasses) ------
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.errorCode;

    // Attach validation details if present
    if (error instanceof ValidationError && error.details) {
      details = error.details;
    }

  // ------ Zod Validation Errors ------
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed.';
    errorCode = 'VALIDATION_ERROR';
    details = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

  // ------ Prisma Errors ------
  } else if (error.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as Error & { code?: string; meta?: Record<string, unknown> };

    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists.';
        errorCode = 'CONFLICT';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found.';
        errorCode = 'NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Operation failed due to a dependency constraint.';
        errorCode = 'CONSTRAINT_ERROR';
        break;
      default:
        statusCode = 500;
        message = 'A database error occurred.';
        errorCode = 'DATABASE_ERROR';
    }
  } else if (error.constructor?.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Invalid data provided.';
    errorCode = 'VALIDATION_ERROR';

  // ------ JWT Errors ------
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = error.name === 'TokenExpiredError'
      ? 'Your session has expired. Please login again.'
      : 'Invalid authentication token.';
    errorCode = 'AUTH_ERROR';

  // ------ Generic Errors ------
  } else if (error instanceof Error) {
    message = error.message;
    if (error.name === 'ValidationError') statusCode = 400;
    if (error.name === 'UnauthorizedError') statusCode = 401;
  }

  // Stack trace — development only
  if (process.env.NODE_ENV === 'development') {
    stack = error.stack;
  }

  // Always log full details server-side
  console.error(`[ERROR] ${statusCode} ${errorCode} — ${message}`, {
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });

  // Send standardized response
  const extras: Record<string, unknown> = {};
  if (errorCode) extras.errorCode = errorCode;
  if (details) extras.details = details;
  if (stack) extras.stack = stack;

  ApiResponseHandler.error(res, message, statusCode, Object.keys(extras).length > 0 ? extras : undefined);
}

