import express, { Express } from 'express';
import { env } from './env';
import { v1Router } from '../routes/v1';
import { webhookRouter } from '../routes/webhook.route';
import { cors } from '../middlewares/cors.middleware';
import { requestLog } from '../middlewares/requestLog.middleware';
import { securityHeaders } from '../middlewares/securityHeaders.middleware';
import { notFound } from '../middlewares/notFound.middleware';
import { errorConverter, errorHandler } from '../middlewares/error.middleware';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // so req.ip is the real client behind the platform proxy (see TRUST_PROXY)
  app.set('trust proxy', env.trustProxyHops);
  // flat query strings only (?page=2), no qs nested objects/arrays
  app.set('query parser', 'simple');

  // first, so every request (webhooks and preflights included) is timed
  app.use(requestLog);

  app.use(securityHeaders);

  // must run before any route so preflight requests get CORS headers
  app.use(cors);

  // Paystack webhooks must be verified against the *raw* request body, so
  // this route is mounted before express.json() touches the stream.
  app.use('/v1/webhooks', webhookRouter);

  // Parse JSON bodies for everything else. The API is JSON-only: no
  // urlencoded parser, whose nested-object syntax (a[b]=c) is a needless
  // way to smuggle objects where strings are expected.
  app.use(express.json({ limit: '10kb' }));

  app.get('/v1/status', (_req, res) => res.send('OK'));

  app.use('/v1', v1Router);

  app.use(notFound);
  app.use(errorConverter);
  app.use(errorHandler);

  return app;
}
