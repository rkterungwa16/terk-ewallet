import { NextFunction, Request, Response } from 'express';
import { Customer, CustomerRole } from '../models/customer.model';
import { jwt } from '../utils/jwt';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Verifies the `Authorization: Bearer <token>` header and loads the
 * matching customer onto `req.customer`. Optionally restricts access to a
 * set of roles.
 */
export function authenticate(...allowedRoles: CustomerRole[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', httpStatus.UNAUTHORIZED);
    }

    const token = header.slice('Bearer '.length);

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw new ApiError((err as Error).message || 'Unauthorized', httpStatus.UNAUTHORIZED);
    }

    const customer = await Customer.findById(payload.sub).exec();
    if (!customer) {
      throw new ApiError('Unauthorized', httpStatus.UNAUTHORIZED);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(customer.role)) {
      throw new ApiError('Forbidden', httpStatus.FORBIDDEN);
    }

    req.customer = customer;
    next();
  });
}
