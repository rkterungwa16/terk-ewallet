import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';
import { isProduction } from '../config/env';

/** Normalizes anything thrown into an ApiError. */
export function errorConverter(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (err instanceof ApiError) {
    next(err);
    return;
  }

  const error = err as { message?: string; status?: number; code?: number };

  // Mongoose duplicate-key error
  if (error.code === 11000) {
    next(new ApiError('A record with these details already exists', httpStatus.CONFLICT));
    return;
  }

  next(
    new ApiError(
      error.message || 'Internal server error',
      error.status || httpStatus.INTERNAL_SERVER_ERROR,
    ),
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const body: Record<string, unknown> = {
    code: err.status,
    message: err.message,
  };
  if (err.errors) body.errors = err.errors;
  if (!isProduction) body.stack = err.stack;

  res.status(err.status).json(body);
}
