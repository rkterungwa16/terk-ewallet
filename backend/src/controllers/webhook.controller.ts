import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { walletService } from '../services/wallet.service';
import { asyncHandler } from '../utils/asyncHandler';

interface PaystackWebhookBody {
  event: string;
  data: { reference: string; status?: string };
}

function isValidSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', env.paystackSecretKey).update(rawBody).digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const handlePaystackWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.header('x-paystack-signature');

  if (!req.rawBody || !isValidSignature(req.rawBody, signature)) {
    // Don't leak *why* verification failed; just refuse it.
    res.status(401).end();
    return;
  }

  const body = JSON.parse(req.rawBody.toString('utf8')) as PaystackWebhookBody;
  const { event, data } = body;

  switch (event) {
    case 'charge.success':
      // A non-success outcome here (already processed, or Paystack's own
      // verify call disagreeing with the webhook payload) is an expected
      // case, not a delivery failure — we still ack with 200 so Paystack
      // doesn't retry a webhook we've already dealt with.
      await walletService.confirmFunding(data.reference).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`charge.success webhook: ${(err as Error).message}`);
      });
      break;

    case 'transfer.success':
      await walletService.resolveWithdrawal(data.reference, 'success');
      break;

    case 'transfer.failed':
      await walletService.resolveWithdrawal(data.reference, 'failed');
      break;

    case 'transfer.reversed':
      await walletService.resolveWithdrawal(data.reference, 'reversed');
      break;

    default:
      // Unhandled event types are fine to ignore.
      break;
  }

  res.status(200).end();
});
