import express, { Express } from 'express';
import { v1Router } from '../routes/v1';
import { webhookRouter } from '../routes/webhook.route';
import { notFound } from '../middlewares/notFound.middleware';
import { errorConverter, errorHandler } from '../middlewares/error.middleware';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // Paystack webhooks must be verified against the *raw* request body, so
  // this route is mounted before express.json() touches the stream.
  app.use('/v1/webhooks', webhookRouter);

  // parse JSON bodies for everything else
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // basic request log, no morgan dependency
  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/v1/status', (_req, res) => res.send('OK'));

  app.use('/v1', v1Router);

  app.use(notFound);
  app.use(errorConverter);
  app.use(errorHandler);

  return app;
}
