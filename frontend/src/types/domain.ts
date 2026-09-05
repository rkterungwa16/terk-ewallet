/**
 * Domain types mirroring the JSON the wallet API returns.
 *
 * INTERFACE VS TYPE ALIAS (design decision, applied consistently across this
 * codebase):
 *   We use `interface` for object shapes that represent an entity or a
 *   contract — things that are conceptually "a Customer", "a Transaction" —
 *   especially ones crossing a boundary (API responses, component props).
 *   Interfaces communicate "this is an object with at least these
 *   properties" and support declaration merging, which is exactly the right
 *   semantics for a DTO a backend team could add fields to later.
 *
 *   We reach for `type` instead when we need something an `interface`
 *   syntactically cannot express: unions, discriminated unions, mapped
 *   types, conditional types, tuples, or a function signature. You'll see
 *   that split maintained throughout: entities/props => interface,
 *   everything algebraic => type. See src/types/async.ts and
 *   src/types/utility.ts for the `type` side of that split.
 */

export type CustomerRole = 'customer' | 'admin'; // UNION TYPE: a closed set of string literals

export interface BankAccountSummary {
  id: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export interface Customer {
  id: string;
  accountNumber: number;
  name?: string;
  email: string;
  role: CustomerRole;
  balanceKobo: number;
  balanceNaira: number;
  bankAccounts: BankAccountSummary[];
  createdAt: string;
}

export type TransactionOperation = 'deposit' | 'withdrawal' | 'transfer' | 'reversal';
export type TransactionChannel = 'paystack' | 'internal';
export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Transaction {
  id: string;
  accountNumber: number;
  destinationAccountNumber?: number;
  operation: TransactionOperation;
  channel: TransactionChannel;
  amountKobo: number;
  amountNaira: number;
  status: TransactionStatus;
  reference: string;
  createdAt: string;
}

export interface Bank {
  name: string;
  code: string;
  active: boolean;
}

export interface AuthToken {
  type: 'Bearer';
  accessToken: string;
  expiresInMinutes: number;
}

export interface FundInitializeResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}
