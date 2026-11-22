import { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config/env';

/**
 * Baseline security headers for a JSON-only API (no helmet dependency).
 * Nothing here is ever meant to render as a page, be framed or be cached:
 * responses carry balances, ledgers and bank details.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // a response is never a document that can run script or load anything
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // customer data must not sit in shared or browser caches
  res.setHeader('Cache-Control', 'no-store');
  if (isProduction) {
    // TLS is terminated at the platform edge; tell browsers to never use http
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
