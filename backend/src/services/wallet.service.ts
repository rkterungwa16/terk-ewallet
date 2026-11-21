import crypto from 'node:crypto';
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

function newReference(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Atomically debits a wallet, refusing the update if funds are insufficient. */
async function debitWallet(customerId: string, amountKobo: number) {
  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, balanceKobo: { $gte: amountKobo } },
    { $inc: { balanceKobo: -amountKobo } },
    { new: true },
  ).exec();

  if (!updated) {
    throw new ApiError('Insufficient wallet balance', httpStatus.BAD_REQUEST);
  }
  return updated;
}

/** Atomically credits a wallet. */
async function creditWallet(customerId: string, amountKobo: number) {
  const updated = await Customer.findByIdAndUpdate(
    customerId,
    { $inc: { balanceKobo: amountKobo } },
    { new: true },
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
   * The webhook passes `signedCharge`: the charge data from its payload,
   * already authenticated by Paystack's HMAC signature. That is as
   * trustworthy as a verify call, so it is used directly and the webhook
   * path never waits on Paystack's API. Without it, Paystack is asked.
   */
  async confirmFunding(reference: string, signedCharge?: PaystackVerifyData) {
    const transaction = await Transaction.findOne({ reference, operation: 'deposit' }).exec();
    if (!transaction) {
      throw new ApiError('Unknown transaction reference', httpStatus.NOT_FOUND);
    }

    if (transaction.status === 'success') {
      const customer = await Customer.findById(transaction.customer).exec();
      return { transaction: transaction.toPublicJSON(), customer: customer?.toPublicJSON() };
    }

    const verified: PaystackVerifyData =
      signedCharge ?? (await paystackService.verifyTransaction(reference));

    if (verified.status !== 'success') {
      transaction.status = 'failed';
      await transaction.save();
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

    // Guard against double-processing if the webhook and the verify
    // endpoint both resolve at roughly the same time.
    try {
      await PaystackEvent.create({
        event: 'charge.success',
        reference,
        rawPayload: verified as unknown as Record<string, unknown>,
      });
    } catch (err) {
      const alreadyProcessed = (err as { code?: number }).code === 11000;
      if (alreadyProcessed) {
        const freshTransaction = await Transaction.findOne({ reference }).exec();
        const customer = await Customer.findById(transaction.customer).exec();
        return {
          transaction: freshTransaction?.toPublicJSON(),
          customer: customer?.toPublicJSON(),
        };
      }
      throw err;
    }

    const customer = await creditWallet(String(transaction.customer), transaction.amountKobo);
    transaction.status = 'success';
    transaction.balanceAfterKobo = customer.balanceKobo;
    await transaction.save();

    return { transaction: transaction.toPublicJSON(), customer: customer.toPublicJSON() };
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

    const debitedSender = await debitWallet(String(sender._id), amountKobo);

    const senderTransaction = await Transaction.create({
      customer: sender._id,
      accountNumber: sender.accountNumber,
      destinationAccountNumber,
      operation: 'transfer',
      channel: 'internal',
      amountKobo: -amountKobo,
      balanceAfterKobo: debitedSender.balanceKobo,
      reference,
      status: 'success',
    });

    const creditedDestination = await creditWallet(String(destination._id), amountKobo);

    await Transaction.create({
      customer: destination._id,
      accountNumber: destination.accountNumber,
      destinationAccountNumber: sender.accountNumber,
      operation: 'transfer',
      channel: 'internal',
      amountKobo,
      balanceAfterKobo: creditedDestination.balanceKobo,
      reference: `${reference}_credit`,
      status: 'success',
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
    // document and racing with concurrent saves of the same customer.
    const updated = await Customer.findByIdAndUpdate(
      customer._id,
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
      throw new ApiError('Customer not found', httpStatus.NOT_FOUND);
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

    const debitedCustomer = await debitWallet(String(customer._id), amountKobo);

    const transaction = await Transaction.create({
      customer: customer._id,
      accountNumber: customer.accountNumber,
      operation: 'withdrawal',
      channel: 'paystack',
      amountKobo: -amountKobo,
      balanceAfterKobo: debitedCustomer.balanceKobo,
      reference,
      status: 'pending',
      meta: { bankAccountId, recipientCode: bankAccount.recipientCode },
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

      // Paystack refused the transfer outright — refund immediately rather
      // than leaving the customer's funds stuck in limbo.
      await creditWallet(String(customer._id), amountKobo);
      transaction.status = 'failed';
      await transaction.save();
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
    const settled = await Transaction.findOneAndUpdate(
      { reference, operation: 'withdrawal', status: 'pending' },
      { $set: { status: outcome === 'success' ? 'success' : 'failed' } },
      { new: true },
    ).exec();
    if (!settled) {
      return false; // already handled, or not one of ours
    }

    if (outcome !== 'success') {
      // failed or reversed: give the money back
      await creditWallet(String(settled.customer), Math.abs(settled.amountKobo));
    }
    return true;
  },
};
