import { apiFetch } from './client';
import type {
  AuthToken, Bank, Customer, FundInitializeResult, Transaction,
} from '../types/domain';

// UTILITY TYPES: `RegisterPayload` is *derived* from `Customer` rather than
// hand-duplicated. `Pick<Customer, 'email' | 'name'>` reuses exactly the
// email/name types already defined on Customer (so if `name` ever becomes
// required there instead of optional, this payload type updates itself),
// and `& { password: string }` adds the one field a Customer entity
// wouldn't carry. `LoginPayload` then reuses `RegisterPayload` again via
// `Pick`, rather than being written out a third time.
export type RegisterPayload = Pick<Customer, 'email' | 'name'> & { password: string };
export type LoginPayload = Pick<RegisterPayload, 'email' | 'password'>;

export interface AuthResponse {
  customer: Customer;
  token: AuthToken;
}

export interface InitializeFundingPayload {
  amount: number;
}

export interface InternalTransferPayload {
  destinationAccountNumber: number;
  amount: number;
}

export interface AddBankAccountPayload {
  accountNumber: string;
  bankCode: string;
}

export interface WithdrawPayload {
  amount: number;
  bankAccountId: string;
}

export interface TransferResult {
  transaction: Transaction;
  customer: Customer;
}

export const authApi = {
  register: (payload: RegisterPayload, signal?: AbortSignal) =>
    apiFetch<AuthResponse, 'POST', RegisterPayload>({
      method: 'POST',
      path: '/auth/register',
      body: payload,
      signal,
      authenticated: false,
    }),

  login: (payload: LoginPayload, signal?: AbortSignal) =>
    apiFetch<AuthResponse, 'POST', LoginPayload>({
      method: 'POST',
      path: '/auth/login',
      body: payload,
      signal,
      authenticated: false,
    }),
};

export const customerApi = {
  me: (signal?: AbortSignal) => apiFetch<Customer>({ method: 'GET', path: '/customers/me', signal }),
};

export const walletApi = {
  transactions: (params: { page?: number; perPage?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.perPage) query.set('perPage', String(params.perPage));
    const qs = query.toString();
    return apiFetch<Transaction[]>({ method: 'GET', path: `/wallet/transactions${qs ? `?${qs}` : ''}`, signal });
  },

  initializeFunding: (payload: InitializeFundingPayload, signal?: AbortSignal) =>
    apiFetch<FundInitializeResult, 'POST', InitializeFundingPayload>({
      method: 'POST',
      path: '/wallet/fund/initialize',
      body: payload,
      signal,
    }),

  confirmFunding: (reference: string, signal?: AbortSignal) =>
    apiFetch<TransferResult>({ method: 'GET', path: `/wallet/fund/verify/${encodeURIComponent(reference)}`, signal }),

  transfer: (payload: InternalTransferPayload, signal?: AbortSignal) =>
    apiFetch<TransferResult, 'POST', InternalTransferPayload>({
      method: 'POST',
      path: '/wallet/transfer',
      body: payload,
      signal,
    }),

  banks: (signal?: AbortSignal) => apiFetch<Bank[]>({ method: 'GET', path: '/wallet/banks', signal }),

  addBankAccount: (payload: AddBankAccountPayload, signal?: AbortSignal) =>
    apiFetch<Customer, 'POST', AddBankAccountPayload>({
      method: 'POST',
      path: '/wallet/bank-accounts',
      body: payload,
      signal,
    }),

  withdraw: (payload: WithdrawPayload, signal?: AbortSignal) =>
    apiFetch<TransferResult, 'POST', WithdrawPayload>({
      method: 'POST',
      path: '/wallet/withdraw',
      body: payload,
      signal,
    }),
};
