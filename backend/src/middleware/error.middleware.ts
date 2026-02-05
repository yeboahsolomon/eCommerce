import { Request, Response, NextFunction } from 'express';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
}

/**
 * Global error handler
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let stack: string | undefined;
  
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
    }
  }
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    stack = error.stack;
  }
  
  // Log error
  console.error(`[ERROR] ${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    stack: error.stack,
  });
  
  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(stack && { stack }),
    },
  });
}
