import { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../config/env';

// browsers send Origin as scheme://host[:port] with no trailing slash, while
// CORS_ORIGINS values are often pasted with one (or with a path/uppercase)
function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }
}

const allowedOrigins = new Set(env.corsOrigins.map(normalizeOrigin));

// in development, Vite may open on 127.0.0.1 or bump to :5174 when :5173 is busy
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function isAllowedOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  return allowedOrigins.has(normalized) || (!isProduction && LOOPBACK_ORIGIN.test(normalized));
}

/**
 * Minimal CORS handling so the browser frontend (served from a different
 * origin, e.g. Vite on :5173) can call this API. Only origins listed in
 * CORS_ORIGINS (plus any loopback origin outside production) are allowed;
 * preflight OPTIONS requests are answered here.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  res.setHeader('Vary', 'Origin');

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
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
