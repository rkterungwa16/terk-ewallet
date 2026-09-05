import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { httpStatus } from '../utils/httpStatus';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { customer, accessToken, expiresInMinutes } = await authService.register(req.body);
  res.status(httpStatus.CREATED).json({
    customer: customer.toPublicJSON(),
    token: { type: 'Bearer', accessToken, expiresInMinutes },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { customer, accessToken, expiresInMinutes } = await authService.login(req.body);
  res.json({
    customer: customer.toPublicJSON(),
    token: { type: 'Bearer', accessToken, expiresInMinutes },
  });
});
