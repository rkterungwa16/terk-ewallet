import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Express doesn't forward rejected promises to error middleware on its own
 * (pre-v5). Wrapping every async controller in this saves us from having to
 * hand-write try/catch + next(err) everywhere.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
