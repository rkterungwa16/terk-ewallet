import { NextFunction, Request, Response } from 'express';

/**
 * One log line per request, written when the response finishes, with its
 * status code and how long it took. Mounted first so every route is timed,
 * webhooks and CORS preflights included. No morgan dependency.
 *
 *   2026-11-21T21:50:00.000Z GET /v1/wallet/transactions 200 12.3ms
 *
 * A request whose connection closes before the response is sent is logged
 * with status "aborted", so slow upstream calls that clients gave up on
 * still show up.
 */
export function requestLog(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  let logged = false;

  const log = (status: number | 'aborted') => {
    if (logged) return;
    logged = true;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // eslint-disable-next-line no-console
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${status} ${ms.toFixed(1)}ms`,
    );
  };

  res.on('finish', () => log(res.statusCode));
  res.on('close', () => log(res.writableFinished ? res.statusCode : 'aborted'));

  next();
}
