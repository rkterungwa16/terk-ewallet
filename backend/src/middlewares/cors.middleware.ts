import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Minimal CORS handling so the browser frontend (served from a different
 * origin, e.g. Vite on :5173) can call this API. Only origins listed in
 * CORS_ORIGINS are allowed; preflight OPTIONS requests are answered here.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin && env.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}
