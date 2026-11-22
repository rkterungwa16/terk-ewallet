import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { walletService } from '../services/wallet.service';
import { PaystackVerifyData } from '../services/paystack.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

interface PaystackWebhookBody {
  event: string;
  // for charge.* events this is the same charge object /transaction/verify returns
  data: PaystackVerifyData;
}

// Outcomes that retrying the webhook can't change: an unknown reference,
// a charge that didn't succeed, or a paid amount that doesn't match.
const SETTLED_STATUSES: readonly number[] = [
  httpStatus.NOT_FOUND,
  httpStatus.PAYMENT_REQUIRED,
  httpStatus.CONFLICT,
];

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

  let body: PaystackWebhookBody;
  try {
    body = JSON.parse(req.rawBody.toString('utf8')) as PaystackWebhookBody;
  } catch {
    res.status(400).end();
    return;
  }
  const { event, data } = body;

  // Every event we act on is keyed by reference. Without one, a lookup by
  // `{ reference: undefined }` would have Mongoose drop the condition and
  // match some other customer's transaction.
  if (typeof data?.reference !== 'string' || data.reference === '') {
    res.status(200).end();
    return;
  }

  switch (event) {
    case 'charge.success':
      // The signed payload is the charge itself, so no verify round trip:
      // this path only touches the database.
      try {
        await walletService.confirmFunding(data.reference, { signedCharge: data });
      } catch (err) {
        if (err instanceof ApiError && SETTLED_STATUSES.includes(err.status)) {
          // Expected outcome, not a delivery failure: ack so Paystack
          // doesn't keep retrying it.
          // eslint-disable-next-line no-console
          console.error(`charge.success webhook ${data.reference}: ${err.message}`);
        } else {
          // Anything else (e.g. the database is down) is rethrown -> 500,
          // so Paystack retries the webhook later instead of us losing it.
          throw err;
        }
      }
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
