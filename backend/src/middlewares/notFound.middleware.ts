import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError('Not found', httpStatus.NOT_FOUND));
}
