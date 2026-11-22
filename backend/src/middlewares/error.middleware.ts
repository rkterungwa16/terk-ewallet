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

  const error = err as {
    message?: string;
    status?: number;
    statusCode?: number;
    code?: number;
    name?: string;
    expose?: boolean;
  };

  // Mongoose duplicate-key error
  if (error.code === 11000) {
    next(new ApiError('A record with these details already exists', httpStatus.CONFLICT));
    return;
  }

  // A malformed id or a value Mongoose couldn't cast/validate: the client's
  // fault, but the raw message names internal models and paths.
  if (error.name === 'CastError' || error.name === 'ValidationError') {
    next(new ApiError('Invalid request', httpStatus.BAD_REQUEST));
    return;
  }

  // body-parser and other http-errors set `expose` on client errors (bad
  // JSON, payload too large); their messages are safe to show.
  const status = error.status ?? error.statusCode;
  if (error.expose && status && status >= 400 && status < 500) {
    next(new ApiError(error.message || 'Bad request', status));
    return;
  }

  // Anything else is unexpected: log it in full, but never send driver,
  // stack or infrastructure details to the client.
  // eslint-disable-next-line no-console
  console.error(err);
  const wrapped = new ApiError('Internal server error', httpStatus.INTERNAL_SERVER_ERROR);
  if (!isProduction && err instanceof Error) wrapped.stack = err.stack;
  next(wrapped);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err.status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`${err.status} ${err.message}`);
  }
  const body: Record<string, unknown> = {
    code: err.status,
    message: err.message,
  };
  if (err.errors) body.errors = err.errors;
  if (!isProduction) body.stack = err.stack;

  res.status(err.status).json(body);
}
