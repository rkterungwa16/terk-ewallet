import crypto from 'node:crypto';
import { ClientSession } from 'mongoose';
import { AuthCustomer, Customer, toPublicCustomer } from '../models/customer.model';
import {
  ITransaction,
  PUBLIC_TRANSACTION_FIELDS,
  Transaction,
  toPublicTransaction,
} from '../models/transaction.model';
import { PaystackEvent } from '../models/paystack-event.model';
import { paystackService, PaystackUnavailableError, PaystackVerifyData } from './paystack.service';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';
import { nairaToKobo } from '../utils/money';
import { cachedValue } from '../utils/cachedValue';
import { withTransaction } from '../config/transactions';

function newReference(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Atomically debits a wallet, refusing the update if funds are insufficient. */
async function debitWallet(customerId: string, amountKobo: number, session?: ClientSession) {
  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, balanceKobo: { $gte: amountKobo } },
    { $inc: { balanceKobo: -amountKobo } },
    { new: true, session },
  ).exec();

  if (!updated) {
    throw new ApiError('Insufficient wallet balance', httpStatus.BAD_REQUEST);
  }
  return updated;
}

/** Atomically credits a wallet. */
async function creditWallet(customerId: string, amountKobo: number, session?: ClientSession) {
  const updated = await Customer.findByIdAndUpdate(
    customerId,
    { $inc: { balanceKobo: amountKobo } },
    { new: true, session },
  ).exec();

  if (!updated) {
    throw new ApiError('Customer not found', httpStatus.NOT_FOUND);
  }
  return updated;
}

// Paystack's bank list changes rarely; fetching it on every /banks request
// and every bank-account save is pure latency.
const BANK_LIST_TTL_MS = 24 * 60 * 60 * 1000;
const getBanks = cachedValue(() => paystackService.listBanks(), BANK_LIST_TTL_MS);

/** A customer's public profile by id, read lean and without the password hash. */
async function publicCustomerById(id: unknown) {
  const customer = await Customer.findById(id).select('-passwordHash').lean<AuthCustomer>().exec();
  return customer ? toPublicCustomer(customer) : undefined;
}

// payout destinations a customer may save
const MAX_BANK_ACCOUNTS = 10;

// Paystack charge statuses after which a charge can never succeed
const FINAL_FAILURE_STATUSES: readonly string[] = ['failed', 'reversed'];

/**
 * Who is confirming a deposit. A customer may only confirm their own
 * deposits. The Paystack webhook may confirm any deposit, and carries the
 * signed charge data. Each caller must pick one, so a new caller can't
 * forget the ownership check.
 */
export type FundingConfirmer = { customerId: string } | { signedCharge: PaystackVerifyData };

export const walletService = {
  getBalance(customer: AuthCustomer) {
    return toPublicCustomer(customer);
  },

  async listTransactions(customerId: string, page = 1, perPage = 30) {
    // lean(): read-only list, so skip hydrating full Mongoose documents
    const transactions = await Transaction.find({ customer: customerId })
      .select(PUBLIC_TRANSACTION_FIELDS)
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .lean<ITransaction[]>()
      .exec();
    return transactions.map(toPublicTransaction);
  },

  /**
   * Step 1 of funding a wallet: start a Paystack charge and hand the
   * frontend an authorization_url to redirect the customer to (or use with
   * Paystack's inline/popup JS). Records a pending deposit transaction so
   * the ledger has an entry from the moment funding is attempted.
   */
  async initializeFunding(customer: AuthCustomer, amountNaira: number) {
    const amountKobo = nairaToKobo(amountNaira);
    const reference = newReference('dep');

    const paystackData = await paystackService.initializeTransaction({
      email: customer.email,
      amountKobo,
      reference,
    });

    await Transaction.create({
      customer: customer._id,
      accountNumber: customer.accountNumber,
      operation: 'deposit',
      channel: 'paystack',
      amountKobo,
      reference,
      status: 'pending',
    });

    return {
      reference,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
    };
  },

  /**
   * Step 2 of funding a wallet: confirm with Paystack what really happened
   * to a charge, and credit the wallet if (and only if) it succeeded and
   * hasn't already been credited. Safe to call multiple times for the same
   * reference — called both from the client-side "verify" polling endpoint
   * and from the charge.success webhook, whichever arrives first wins.
   *
   * A customer (`customerId`) can only confirm their own deposits.
   *
   * The webhook passes `signedCharge`: the charge data from its payload,
   * already authenticated by Paystack's HMAC signature. That is as
   * trustworthy as a verify call, so it is used directly and the webhook
   * path never waits on Paystack's API. Without it, Paystack is asked.
   */
  async confirmFunding(reference: string, confirmer: FundingConfirmer) {
    // An undefined reference would be dropped from the query below and
    // match an arbitrary deposit.
    if (typeof reference !== 'string' || reference === '') {
      throw new ApiError('Unknown transaction reference', httpStatus.NOT_FOUND);
    }
    const signedCharge = 'signedCharge' in confirmer ? confirmer.signedCharge : undefined;
    // Someone else's reference gets the same 404 as an unknown one, so this
    // endpoint can't be used to probe which references exist.
    const ownerFilter = 'customerId' in confirmer ? { customer: confirmer.customerId } : {};
    const transaction = await Transaction.findOne({
      reference,
      operation: 'deposit',
      ...ownerFilter,
    }).exec();
    if (!transaction) {
      throw new ApiError('Unknown transaction reference', httpStatus.NOT_FOUND);
    }

    // Settled deposits are answered from the database, without asking
    // Paystack again.
    if (transaction.status === 'success') {
      return {
        transaction: transaction.toPublicJSON(),
        customer: await publicCustomerById(transaction.customer),
      };
    }
    // A failed charge can't turn into a success, so re-polling it needs no
    // Paystack call either. Only the signed webhook (`signedCharge`) is
    // allowed past this, since it is Paystack itself reporting success.
    if (transaction.status === 'failed' && !signedCharge) {
      throw new ApiError('Payment was not successful', httpStatus.PAYMENT_REQUIRED);
    }

    const verified: PaystackVerifyData =
      signedCharge ?? (await paystackService.verifyTransaction(reference));

    if (verified.status !== 'success') {
      // Mark failed only when it's final. An abandoned or in-progress charge
      // stays pending, because the customer can still go back and pay.
      if (FINAL_FAILURE_STATUSES.includes(verified.status)) {
        transaction.status = 'failed';
        await transaction.save();
      }
      throw new ApiError(
        `Payment was not successful (status: ${verified.status})`,
        httpStatus.PAYMENT_REQUIRED,
      );
    }

    // Credit what we asked Paystack to charge, and only if that is what was
    // paid. Left pending (not failed) so a mismatch can be looked into.
    if (verified.amount !== transaction.amountKobo || verified.currency !== 'NGN') {
      throw new ApiError(
        `Paid ${verified.amount} ${verified.currency} does not match the expected ${transaction.amountKobo} NGN`,
        httpStatus.CONFLICT,
      );
    }

    // The idempotency marker, the credit and the ledger update commit
    // together: a crash can't leave the marker written (blocking any retry)
    // with the wallet never credited.
    try {
      const customer = await withTransaction(async (session) => {
        // Guards against double-processing if the webhook and the verify
        // endpoint both resolve at roughly the same time.
        await PaystackEvent.create(
          [
            {
              event: 'charge.success',
              reference,
              rawPayload: verified as unknown as Record<string, unknown>,
            },
          ],
          { session },
        );
        const credited = await creditWallet(
          String(transaction.customer),
          transaction.amountKobo,
          session,
        );
        transaction.status = 'success';
        transaction.balanceAfterKobo = credited.balanceKobo;
        await transaction.save({ session });
        return credited;
      });
      return { transaction: transaction.toPublicJSON(), customer: customer.toPublicJSON() };
    } catch (err) {
      const alreadyProcessed = (err as { code?: number }).code === 11000;
      if (alreadyProcessed) {
        const [freshTransaction, customer] = await Promise.all([
          Transaction.findOne({ reference })
            .select(PUBLIC_TRANSACTION_FIELDS)
            .lean<ITransaction>()
            .exec(),
          publicCustomerById(transaction.customer),
        ]);
        return {
          transaction: freshTransaction ? toPublicTransaction(freshTransaction) : undefined,
          customer,
        };
      }
      throw err;
    }
  },

  /** Instant wallet-to-wallet transfer, no Paystack call involved. */
  async internalTransfer(
    sender: AuthCustomer,
    destinationAccountNumber: number,
    amountNaira: number,
  ) {
    if (sender.accountNumber === destinationAccountNumber) {
      throw new ApiError('You cannot transfer to your own account', httpStatus.BAD_REQUEST);
    }

    const destination = await Customer.findOne({ accountNumber: destinationAccountNumber })
      .select('_id accountNumber')
      .lean()
      .exec();
    if (!destination) {
      throw new ApiError('Destination account not found', httpStatus.NOT_FOUND);
    }

    const amountKobo = nairaToKobo(amountNaira);
    const reference = newReference('trf');

    // Debit, credit and both ledger rows commit together, so a crash
    // between them can't take money out of one wallet without it arriving
    // in the other.
    const { debitedSender, senderTransaction } = await withTransaction(async (session) => {
      const debited = await debitWallet(String(sender._id), amountKobo, session);
      const credited = await creditWallet(String(destination._id), amountKobo, session);
      const [senderRow] = await Transaction.insertMany(
        [
          {
            customer: sender._id,
            accountNumber: sender.accountNumber,
            destinationAccountNumber,
            operation: 'transfer',
            channel: 'internal',
            amountKobo: -amountKobo,
            balanceAfterKobo: debited.balanceKobo,
            reference,
            status: 'success',
          },
          {
            customer: destination._id,
            accountNumber: destination.accountNumber,
            destinationAccountNumber: sender.accountNumber,
            operation: 'transfer',
            channel: 'internal',
            amountKobo,
            balanceAfterKobo: credited.balanceKobo,
            reference: `${reference}_credit`,
            status: 'success',
          },
        ],
        { session },
      );
      return { debitedSender: debited, senderTransaction: senderRow };
    });

    return {
      transaction: senderTransaction.toPublicJSON(),
      customer: debitedSender.toPublicJSON(),
    };
  },

  async listBanks() {
    return getBanks();
  },

  /** Resolves + saves a bank account as a Paystack transfer recipient, for later payouts. */
  async addBankAccount(customer: AuthCustomer, accountNumber: string, bankCode: string) {
    // Checked before any Paystack call: keeps the customer document bounded
    // and stops repeat saves being used to look up account names.
    const existing = customer.bankAccounts ?? [];
    if (existing.some((b) => b.accountNumber === accountNumber && b.bankCode === bankCode)) {
      throw new ApiError('This bank account is already saved', httpStatus.CONFLICT);
    }
    if (existing.length >= MAX_BANK_ACCOUNTS) {
      throw new ApiError(
        `You can save at most ${MAX_BANK_ACCOUNTS} bank accounts`,
        httpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // The bank name is only a display label, so look it up alongside the
    // Paystack calls and fall back to the code rather than failing the save.
    const bankNamePromise = getBanks()
      .then((banks) => banks.find((b) => b.code === bankCode)?.name ?? bankCode)
      .catch(() => bankCode);

    const resolved = await paystackService.resolveAccountNumber(accountNumber, bankCode);
    const recipient = await paystackService.createTransferRecipient({
      name: resolved.account_name,
      accountNumber,
      bankCode,
    });
    const bankName = await bankNamePromise;

    // $push writes just the new entry, instead of save() re-sending the
    // document and racing with concurrent saves of the same customer. The
    // filter re-checks the cap and duplicate atomically, for concurrent adds.
    const updated = await Customer.findOneAndUpdate(
      {
        _id: customer._id,
        [`bankAccounts.${MAX_BANK_ACCOUNTS - 1}`]: { $exists: false },
        bankAccounts: { $not: { $elemMatch: { accountNumber, bankCode } } },
      },
      {
        $push: {
          bankAccounts: {
            recipientCode: recipient.recipient_code,
            accountNumber,
            accountName: resolved.account_name,
            bankCode,
            bankName,
          },
        },
      },
      { new: true, runValidators: true },
    ).exec();

    if (!updated) {
      throw new ApiError(
        'This bank account is already saved, or the limit was reached',
        httpStatus.CONFLICT,
      );
    }
    return updated.toPublicJSON();
  },

  /**
   * Debits the wallet up front (so the customer can't spend the same funds
   * twice while the transfer is in flight) and asks Paystack to pay out to
   * a saved bank account. If Paystack rejects the request outright, the
   * debit is reversed immediately. If Paystack accepts it, final success or
   * failure arrives later via the transfer.success / transfer.failed / transfer.reversed
   * webhook, at which point the transaction is finalized (and refunded on
   * failure). If we never get an answer (timeout, network error), the
   * transfer may still go through, so it stays pending for the webhook to
   * settle rather than being refunded here.
   */
  async withdraw(customer: AuthCustomer, amountNaira: number, bankAccountId: string) {
    const bankAccount = customer.bankAccounts.find((b) => String(b._id) === bankAccountId);
    if (!bankAccount) {
      throw new ApiError('Bank account not found on your profile', httpStatus.NOT_FOUND);
    }

    const amountKobo = nairaToKobo(amountNaira);
    const reference = newReference('wdr');

    // Debit and pending ledger row commit together, so every debit has a
    // ledger entry the reconciler can find. Paystack is called after
    // commit: a transaction must never stay open across a slow external call.
    const { debitedCustomer, transaction } = await withTransaction(async (session) => {
      const debited = await debitWallet(String(customer._id), amountKobo, session);
      const [row] = await Transaction.create(
        [
          {
            customer: customer._id,
            accountNumber: customer.accountNumber,
            operation: 'withdrawal',
            channel: 'paystack',
            amountKobo: -amountKobo,
            balanceAfterKobo: debited.balanceKobo,
            reference,
            status: 'pending',
            meta: { bankAccountId, recipientCode: bankAccount.recipientCode },
          },
        ],
        { session },
      );
      return { debitedCustomer: debited, transaction: row };
    });

    try {
      const transfer = await paystackService.initiateTransfer({
        amountKobo,
        recipientCode: bankAccount.recipientCode,
        reference,
        reason: 'Wallet withdrawal',
      });

      transaction.meta = { ...transaction.meta, transferCode: transfer.transfer_code };
      if (transfer.status === 'success') {
        transaction.status = 'success';
      }
      await transaction.save();
    } catch (err) {
      if (err instanceof PaystackUnavailableError) {
        // Outcome unknown: Paystack may have accepted the transfer before
        // we stopped waiting. Refunding now could pay the customer twice,
        // so leave it pending; the transfer.* webhook will settle it.
        // eslint-disable-next-line no-console
        console.error(`withdrawal ${reference}: ${err.message}; left pending`);
        return {
          transaction: transaction.toPublicJSON(),
          customer: debitedCustomer.toPublicJSON(),
        };
      }

      // Paystack refused the transfer outright, so refund now rather than
      // leaving the customer's funds stuck. The refund and the failed
      // status commit together.
      await withTransaction(async (session) => {
        await creditWallet(String(customer._id), amountKobo, session);
        transaction.status = 'failed';
        await transaction.save({ session });
      });
      throw err;
    }

    return { transaction: transaction.toPublicJSON(), customer: debitedCustomer.toPublicJSON() };
  },

  /**
   * Finalizes a withdrawal once we know, asynchronously, whether the
   * transfer actually landed. Called from the transfer.* webhook and from
   * the pending-withdrawal reconciler, possibly at the same time for the
   * same reference.
   *
   * The pending -> final transition is a single conditional update, so only
   * one caller can win it, and only the winner refunds. Returns true if this
   * call settled the withdrawal, false if it was already settled (or isn't
   * one of ours).
   */
  async resolveWithdrawal(
    reference: string,
    outcome: 'success' | 'failed' | 'reversed',
  ): Promise<boolean> {
    // Settling and refunding commit together: a crash between them can't
    // mark a withdrawal failed without the money coming back.
    return withTransaction(async (session) => {
      const settled = await Transaction.findOneAndUpdate(
        { reference, operation: 'withdrawal', status: 'pending' },
        { $set: { status: outcome === 'success' ? 'success' : 'failed' } },
        { new: true, session },
      ).exec();
      if (!settled) {
        return false; // already handled, or not one of ours
      }

      if (outcome !== 'success') {
        // failed or reversed: give the money back
        await creditWallet(String(settled.customer), Math.abs(settled.amountKobo), session);
      }
      return true;
    });
  },
};
