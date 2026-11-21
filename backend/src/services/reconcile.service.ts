import { Types } from 'mongoose';
import { Transaction } from '../models/transaction.model';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';
import { paystackService } from './paystack.service';
import { walletService } from './wallet.service';

const BATCH_SIZE = 10;

export type ReconcileOutcome =
  'success' | 'refunded' | 'not_found' | 'pending' | 'skipped' | 'error';

export interface ReconcileSummary {
  checked: number;
  outcomes: Record<ReconcileOutcome, number>;
}

/** Paystack's answer when it has no transfer with that reference. */
function isTransferNotFound(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === httpStatus.NOT_FOUND || /transfer not found/i.test(err.message);
}

/**
 * Asks Paystack what became of one pending withdrawal and settles it.
 * Anything Paystack still reports as in flight (pending, otp, received, ...)
 * is left for a later run or the webhook.
 */
async function reconcileOne(reference: string): Promise<ReconcileOutcome> {
  let status: string;
  try {
    status = (await paystackService.verifyTransfer(reference)).status;
  } catch (err) {
    if (!isTransferNotFound(err)) throw err;
    // Paystack never received the transfer request, so no money left and no
    // webhook will ever come: give the customer their money back.
    const settled = await walletService.resolveWithdrawal(reference, 'failed');
    return settled ? 'not_found' : 'skipped';
  }

  let outcome: 'success' | 'failed' | 'reversed';
  if (status === 'success') outcome = 'success';
  else if (status === 'failed' || status === 'reversed') outcome = status;
  else return 'pending';

  const settled = await walletService.resolveWithdrawal(reference, outcome);
  if (!settled) return 'skipped'; // the webhook got there first
  return outcome === 'success' ? 'success' : 'refunded';
}

/**
 * Settles withdrawals left pending longer than `minAgeMs`: normally the
 * transfer.* webhook does this, but if the transfer request timed out before
 * reaching Paystack, or the webhook was lost, nothing else ever will.
 *
 * Works through them oldest first in small batches, so it never fires a
 * burst of Paystack calls, and one failing verification doesn't stop the rest.
 */
export async function reconcilePendingWithdrawals(minAgeMs: number): Promise<ReconcileSummary> {
  const cutoff = new Date(Date.now() - minAgeMs);
  const summary: ReconcileSummary = {
    checked: 0,
    outcomes: { success: 0, refunded: 0, not_found: 0, pending: 0, skipped: 0, error: 0 },
  };

  let lastId: Types.ObjectId | undefined;
  for (;;) {
    const batch = await Transaction.find({
      operation: 'withdrawal',
      status: 'pending',
      createdAt: { $lt: cutoff },
      ...(lastId ? { _id: { $gt: lastId } } : {}),
    })
      .select('_id reference')
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean<{ _id: Types.ObjectId; reference: string }[]>()
      .exec();
    if (batch.length === 0) break;
    lastId = batch[batch.length - 1]._id;

    const results = await Promise.allSettled(batch.map((t) => reconcileOne(t.reference)));
    results.forEach((result, i) => {
      summary.checked += 1;
      if (result.status === 'fulfilled') {
        summary.outcomes[result.value] += 1;
      } else {
        summary.outcomes.error += 1;
        // eslint-disable-next-line no-console
        console.error(
          `reconcile withdrawal ${batch[i].reference}: ${(result.reason as Error).message}`,
        );
      }
    });

    if (batch.length < BATCH_SIZE) break;
  }

  return summary;
}

/**
 * Runs the reconciler every `intervalMs` inside this process. Runs never
 * overlap: a tick that fires while the previous run is still going is
 * skipped. Returns a function that stops the timer.
 */
export function startWithdrawalReconciler(intervalMs: number, minAgeMs: number): () => void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const summary = await reconcilePendingWithdrawals(minAgeMs);
      if (summary.checked > 0) {
        // eslint-disable-next-line no-console
        console.log(`reconciled ${summary.checked} pending withdrawal(s)`, summary.outcomes);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`withdrawal reconciler run failed: ${(err as Error).message}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
