import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackRequest<T>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json: PaystackResponse<T>;
  try {
    json = (await res.json()) as PaystackResponse<T>;
  } catch {
    throw new ApiError('Received an invalid response from Paystack', httpStatus.BAD_GATEWAY);
  }

  if (!res.ok || json.status === false) {
    throw new ApiError(json.message || 'Paystack request failed', res.status || httpStatus.BAD_GATEWAY);
  }

  return json.data;
}

// ---- Types for the handful of Paystack payloads we actually use -----------

export interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyData {
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  amount: number; // kobo
  paid_at: string | null;
  channel: string;
  currency: string;
  customer: { email: string };
}

export interface PaystackBank {
  name: string;
  code: string;
  active: boolean;
}

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
}

export interface PaystackRecipientData {
  recipient_code: string;
  active: boolean;
}

export interface PaystackTransferData {
  reference: string;
  status: 'success' | 'pending' | 'failed' | 'otp';
  transfer_code: string;
}

// ---- Public API -------------------------------------------------------------

export const paystackService = {
  /** Starts a hosted-checkout charge for funding a wallet. */
  initializeTransaction(params: { email: string; amountKobo: number; reference: string }) {
    return paystackRequest<PaystackInitializeData>('/transaction/initialize', {
      method: 'POST',
      body: {
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: env.paystackCallbackUrl || undefined,
      },
    });
  },

  /** Confirms what actually happened to a charge, by reference. */
  verifyTransaction(reference: string) {
    return paystackRequest<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
  },

  /** Lists Nigerian banks Paystack supports, for populating a bank picker. */
  listBanks() {
    return paystackRequest<PaystackBank[]>('/bank?country=nigeria&currency=NGN');
  },

  /** Confirms an account number/bank pair resolves to a real account, and returns the account name. */
  resolveAccountNumber(accountNumber: string, bankCode: string) {
    return paystackRequest<PaystackResolvedAccount>(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    );
  },

  /** Registers a payout destination so we can send transfers to it. */
  createTransferRecipient(params: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }) {
    return paystackRequest<PaystackRecipientData>('/transferrecipient', {
      method: 'POST',
      body: {
        type: 'nuban',
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: 'NGN',
      },
    });
  },

  /** Sends money out of the Paystack balance to a previously-created recipient. */
  initiateTransfer(params: { amountKobo: number; recipientCode: string; reference: string; reason?: string }) {
    return paystackRequest<PaystackTransferData>('/transfer', {
      method: 'POST',
      body: {
        source: 'balance',
        amount: params.amountKobo,
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason,
      },
    });
  },
};
