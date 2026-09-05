import { Request, Response } from 'express';
import { walletService } from '../services/wallet.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getBalance = (req: Request, res: Response): void => {
  res.json(walletService.getBalance(req.customer!));
};

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const perPage = req.query.perPage ? Number(req.query.perPage) : 30;
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
  const result = await walletService.confirmFunding(req.params.reference);
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
