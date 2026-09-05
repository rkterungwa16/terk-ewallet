import { Request, Response } from 'express';

export function getProfile(req: Request, res: Response): void {
  res.json(req.customer!.toPublicJSON());
}
