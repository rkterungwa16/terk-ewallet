import { Router } from 'express';
import * as walletController from '../../controllers/wallet.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../validations/validate';
import { rateLimitByCustomer } from '../../middlewares/rateLimit.middleware';
import {
  addBankAccountSchema,
  fundInitializeSchema,
  fundVerifySchema,
  internalTransferSchema,
  withdrawSchema,
} from '../../validations/wallet.validation';

export const walletRouter = Router();

walletRouter.use(authenticate());

const MINUTE = 60 * 1000;
// Money movements and Paystack calls, per customer. Generous for a person,
// tight for a script flooding the ledger or Paystack.
const limitMoneyWrites = rateLimitByCustomer(20, MINUTE);
// Saving a bank account resolves the account holder's name at Paystack, so
// unlimited calls would turn it into a lookup service for anyone's name.
const limitBankAccountAdds = rateLimitByCustomer(5, 60 * MINUTE);

// GET /v1/wallet/balance
walletRouter.get('/balance', walletController.getBalance);

// GET /v1/wallet/transactions?page=&perPage=
walletRouter.get('/transactions', walletController.getTransactions);

// POST /v1/wallet/fund/initialize { amount } -> { authorizationUrl, reference }
walletRouter.post(
  '/fund/initialize',
  limitMoneyWrites,
  validate(fundInitializeSchema),
  walletController.initializeFunding,
);

// GET /v1/wallet/fund/verify/:reference -> confirms & credits (also handled by webhook)
walletRouter.get(
  '/fund/verify/:reference',
  limitMoneyWrites,
  validate(fundVerifySchema),
  walletController.confirmFunding,
);

// POST /v1/wallet/transfer { destinationAccountNumber, amount } -> instant wallet-to-wallet
walletRouter.post(
  '/transfer',
  limitMoneyWrites,
  validate(internalTransferSchema),
  walletController.internalTransfer,
);

// GET /v1/wallet/banks -> list of Paystack-supported banks
walletRouter.get('/banks', walletController.listBanks);

// POST /v1/wallet/bank-accounts { accountNumber, bankCode } -> resolves + saves a payout destination
walletRouter.post(
  '/bank-accounts',
  limitBankAccountAdds,
  validate(addBankAccountSchema),
  walletController.addBankAccount,
);

// POST /v1/wallet/withdraw { amount, bankAccountId } -> payout via Paystack Transfer
walletRouter.post(
  '/withdraw',
  limitMoneyWrites,
  validate(withdrawSchema),
  walletController.withdraw,
);
