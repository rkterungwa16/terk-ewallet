import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

/**
 * Minimal in-memory, fixed-window rate limiting (no dependency). Counts
 * live in this process only, so with several instances each enforces its
 * own limit. That's fine for slowing down guessing and floods, not for
 * exact quotas.
 */

interface Window {
  count: number;
  resetAt: number;
}

class FixedWindowCounter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    // drop expired windows so the map can't grow without bound
    setInterval(() => {
      const now = Date.now();
      for (const [key, w] of this.windows) if (w.resetAt <= now) this.windows.delete(key);
    }, windowMs).unref();
  }

  private current(key: string): Window | undefined {
    const w = this.windows.get(key);
    if (w && w.resetAt <= Date.now()) {
      this.windows.delete(key);
      return undefined;
    }
    return w;
  }

  /** Seconds until `key` may try again, or 0 if it's under the limit. */
  retryAfter(key: string): number {
    const w = this.current(key);
    return w && w.count >= this.limit ? Math.ceil((w.resetAt - Date.now()) / 1000) : 0;
  }

  hit(key: string): void {
    const w = this.current(key);
    if (w) w.count += 1;
    else this.windows.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

function tooMany(res: Response, retryAfterSeconds: number, message: string): ApiError {
  res.setHeader('Retry-After', String(retryAfterSeconds));
  return new ApiError(message, httpStatus.TOO_MANY_REQUESTS);
}

/** Limits each key returned by `keyOf` to `limit` requests per `windowMs`. */
function rateLimitBy(keyOf: (req: Request) => string, limit: number, windowMs: number) {
  const counter = new FixedWindowCounter(limit, windowMs);
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyOf(req);
    const wait = counter.retryAfter(key);
    if (wait > 0) {
      next(tooMany(res, wait, 'Too many requests, please try again later'));
      return;
    }
    counter.hit(key);
    next();
  };
}

/** Limits each client IP to `limit` requests per `windowMs`. */
export function rateLimitByIp(limit: number, windowMs: number) {
  return rateLimitBy((req) => req.ip ?? 'unknown', limit, windowMs);
}

/**
 * Limits each authenticated customer to `limit` requests per `windowMs`.
 * Mount after `authenticate()`. Used on endpoints that write to the ledger
 * or call Paystack, so one account can't flood either.
 */
export function rateLimitByCustomer(limit: number, windowMs: number) {
  return rateLimitBy(
    (req) => (req.customer ? `customer:${String(req.customer._id)}` : `ip:${req.ip ?? 'unknown'}`),
    limit,
    windowMs,
  );
}

/**
 * Limits failed logins per email address, wherever they come from, so a
 * password can't be guessed by spreading attempts across IPs. Only 401
 * responses count, and a successful login clears the count, so normal
 * users are never affected. Mount after body parsing and validation.
 */
export function limitLoginFailures(limit: number, windowMs: number) {
  const counter = new FixedWindowCounter(limit, windowMs);
  return (req: Request, res: Response, next: NextFunction): void => {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase();
    const wait = counter.retryAfter(email);
    if (wait > 0) {
      next(tooMany(res, wait, 'Too many failed login attempts, please try again later'));
      return;
    }
    res.on('finish', () => {
      if (res.statusCode === httpStatus.UNAUTHORIZED) counter.hit(email);
      else if (res.statusCode < 400) counter.reset(email);
    });
    next();
  };
}
