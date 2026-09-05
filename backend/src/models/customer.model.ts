import {
  Schema, model, Document, Types,
} from 'mongoose';
import { nextSequence } from './counter.model';

export const CUSTOMER_ROLES = ['customer', 'admin'] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

export interface IBankAccount {
  _id: Types.ObjectId;
  recipientCode: string; // Paystack transfer recipient code, e.g. RCP_xxx
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  createdAt: Date;
}

export interface ICustomer extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  role: CustomerRole;
  accountNumber: number; // this platform's internal wallet account number
  balanceKobo: number;
  bankAccounts: IBankAccount[];
  createdAt: Date;
  updatedAt: Date;
  toPublicJSON(): Record<string, unknown>;
}

const bankAccountSchema = new Schema<IBankAccount>(
  {
    recipientCode: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    bankCode: { type: String, required: true },
    bankName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const customerSchema = new Schema<ICustomer>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, maxlength: 128, trim: true },
    role: { type: String, enum: CUSTOMER_ROLES, default: 'customer' },
    accountNumber: {
      type: Number, unique: true, index: true,
    },
    balanceKobo: { type: Number, default: 0, min: 0 },
    bankAccounts: { type: [bankAccountSchema], default: [] },
  },
  { timestamps: true },
);

customerSchema.pre('save', async function assignAccountNumber(next) {
  try {
    if (this.isNew && !this.accountNumber) {
      this.accountNumber = await nextSequence('customerAccountNumber');
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

customerSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    accountNumber: this.accountNumber,
    name: this.name,
    email: this.email,
    role: this.role,
    balanceKobo: this.balanceKobo,
    balanceNaira: this.balanceKobo / 100,
    bankAccounts: this.bankAccounts.map((account: IBankAccount) => ({
      id: account._id,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
    })),
    createdAt: this.createdAt,
  };
};

export const Customer = model<ICustomer>('Customer', customerSchema);
