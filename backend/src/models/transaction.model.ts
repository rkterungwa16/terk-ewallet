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
      index: true,
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
      index: true,
    },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'pending' },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    accountNumber: this.accountNumber,
    destinationAccountNumber: this.destinationAccountNumber,
    operation: this.operation,
    channel: this.channel,
    amountKobo: this.amountKobo,
    amountNaira: this.amountKobo / 100,
    status: this.status,
    reference: this.reference,
    createdAt: this.createdAt,
  };
};

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
