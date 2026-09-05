import { Router, raw } from 'express';
import { handlePaystackWebhook } from '../controllers/webhook.controller';

export const webhookRouter = Router();

// POST /v1/webhooks/paystack
// Mounted in config/express.ts *before* express.json(), and using
// express.raw() here (not express.json()) so req.body stays an untouched
// Buffer — required to verify the x-paystack-signature HMAC correctly.
webhookRouter.post(
  '/paystack',
  raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body as Buffer;
    next();
  },
  handlePaystackWebhook,
);
