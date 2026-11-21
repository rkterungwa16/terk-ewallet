import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getBalance = (req: Request, res: Response): void => {
  res.json(walletService.getBalance(req.customer!));
};

const DEFAULT_PER_PAGE = 30;
// the frontend asks for up to 200 rows at once (dashboard insights + the transactions page)
const MAX_PER_PAGE = 200;
// keeps .skip() from walking arbitrarily deep into a customer's history
const MAX_PAGE = 1000;

/** Reads a positive integer query param, falling back on missing/invalid input and capping at `max`. */
function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page, 1, MAX_PAGE);
  const perPage = parsePositiveInt(req.query.perPage, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const transactions = await walletService.listTransactions(
    String(req.customer!._id),
    page,
    perPage,
  );
  res.json(transactions);
});

export const initializeFunding = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.initializeFunding(req.customer!, req.body.amount);
  res.json(result);
});

export const confirmFunding = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.confirmFunding(req.params.reference, {
    customerId: String(req.customer!._id),
  });
  res.json(result);
});

export const internalTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.internalTransfer(
    req.customer!,
    req.body.destinationAccountNumber,
    req.body.amount,
  );
  res.json(result);
});

export const listBanks = asyncHandler(async (_req: Request, res: Response) => {
  const banks = await walletService.listBanks();
  res.json(banks);
});

export const addBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.addBankAccount(
    req.customer!,
    req.body.accountNumber,
    req.body.bankCode,
  );
  res.json(result);
});

export const withdraw = asyncHandler(async (req: Request, res: Response) => {
  const result = await walletService.withdraw(
    req.customer!,
    req.body.amount,
    req.body.bankAccountId,
  );
  res.json(result);
});
