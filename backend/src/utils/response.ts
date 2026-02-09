import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export class ApiResponseHandler {
  static success<T>(res: Response, data?: T, message?: string, statusCode = 200) {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 500, error?: any) {
    const response: ApiResponse<null> = {
      success: false,
      message,
      error,
    };
    return res.status(statusCode).json(response);
  }
}
