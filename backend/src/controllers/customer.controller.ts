import { Request, Response } from 'express';
import { toPublicCustomer } from '../models/customer.model';

export function getProfile(req: Request, res: Response): void {
  res.json(toPublicCustomer(req.customer!));
}
