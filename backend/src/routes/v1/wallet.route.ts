import { Router } from 'express';
import * as walletController from '../../controllers/wallet.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../validations/validate';
import {
  addBankAccountSchema,
  fundInitializeSchema,
  internalTransferSchema,
  withdrawSchema,
} from '../../validations/wallet.validation';

export const walletRouter = Router();

walletRouter.use(authenticate());

// GET /v1/wallet/balance
walletRouter.get('/balance', walletController.getBalance);

// GET /v1/wallet/transactions?page=&perPage=
walletRouter.get('/transactions', walletController.getTransactions);

// POST /v1/wallet/fund/initialize { amount } -> { authorizationUrl, reference }
walletRouter.post(
  '/fund/initialize',
  validate(fundInitializeSchema),
  walletController.initializeFunding,
);

// GET /v1/wallet/fund/verify/:reference -> confirms & credits (also handled by webhook)
walletRouter.get('/fund/verify/:reference', walletController.confirmFunding);

// POST /v1/wallet/transfer { destinationAccountNumber, amount } -> instant wallet-to-wallet
walletRouter.post('/transfer', validate(internalTransferSchema), walletController.internalTransfer);

// GET /v1/wallet/banks -> list of Paystack-supported banks
walletRouter.get('/banks', walletController.listBanks);

// POST /v1/wallet/bank-accounts { accountNumber, bankCode } -> resolves + saves a payout destination
walletRouter.post(
  '/bank-accounts',
  validate(addBankAccountSchema),
  walletController.addBankAccount,
);

// POST /v1/wallet/withdraw { amount, bankAccountId } -> payout via Paystack Transfer
walletRouter.post('/withdraw', validate(withdrawSchema), walletController.withdraw);
