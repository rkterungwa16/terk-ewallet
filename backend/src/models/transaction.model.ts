import { Schema, model, Document, Types } from 'mongoose';

export const TRANSACTION_OPERATIONS = ['deposit', 'withdrawal', 'transfer', 'reversal'] as const;
export type TransactionOperation = (typeof TRANSACTION_OPERATIONS)[number];

export const TRANSACTION_STATUSES = ['pending', 'success', 'failed'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export interface ITransaction extends Document {
  customer: Types.ObjectId;
  accountNumber: number;
  destinationAccountNumber?: number;
  operation: TransactionOperation;
  channel: 'paystack' | 'internal';
  amountKobo: number; // negative for debits, positive for credits
  balanceAfterKobo?: number;
  reference: string;
  status: TransactionStatus;
  meta?: Record<string, unknown>;
  createdAt: Date;
  toPublicJSON(): Record<string, unknown>;
}

const transactionSchema = new Schema<ITransaction>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    accountNumber: { type: Number, required: true, index: true },
    destinationAccountNumber: { type: Number },
    operation: { type: String, enum: TRANSACTION_OPERATIONS, required: true },
    channel: { type: String, enum: ['paystack', 'internal'], required: true },
    amountKobo: { type: Number, required: true },
    balanceAfterKobo: { type: Number },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'pending' },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Serves the per-customer history query (filter by customer, newest first)
// straight from the index, with no in-memory sort. Its `customer` prefix also
// covers plain lookups by customer, so that field needs no index of its own.
transactionSchema.index({ customer: 1, createdAt: -1 });

// Serves the pending-withdrawal reconciler. Partial, so it only holds the
// few withdrawals still pending rather than the whole ledger.
transactionSchema.index(
  { operation: 1, status: 1, _id: 1 },
  { partialFilterExpression: { operation: 'withdrawal', status: 'pending' } },
);

/** Fields `toPublicTransaction` reads; use as a projection on lean queries. */
export const PUBLIC_TRANSACTION_FIELDS =
  'accountNumber destinationAccountNumber operation channel amountKobo status reference createdAt';

type PublicTransactionSource = Pick<
  ITransaction,
  | 'accountNumber'
  | 'destinationAccountNumber'
  | 'operation'
  | 'channel'
  | 'amountKobo'
  | 'status'
  | 'reference'
  | 'createdAt'
> & { _id: unknown };

/** Shapes a transaction (hydrated document or lean object) for API responses. */
export function toPublicTransaction(t: PublicTransactionSource): Record<string, unknown> {
  return {
    id: t._id,
    accountNumber: t.accountNumber,
    destinationAccountNumber: t.destinationAccountNumber,
    operation: t.operation,
    channel: t.channel,
    amountKobo: t.amountKobo,
    amountNaira: t.amountKobo / 100,
    status: t.status,
    reference: t.reference,
    createdAt: t.createdAt,
  };
}

transactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return toPublicTransaction(this as unknown as ITransaction);
};

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
