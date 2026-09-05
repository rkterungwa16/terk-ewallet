import { isNumber, matches, max, min, required, RequestSchema } from './validate';

export const fundInitializeSchema: RequestSchema = {
  body: {
    amount: [required('Amount'), isNumber('Amount'), min(100, 'Amount'), max(1000000, 'Amount')],
  },
};

export const internalTransferSchema: RequestSchema = {
  body: {
    amount: [required('Amount'), isNumber('Amount'), min(10, 'Amount'), max(1000000, 'Amount')],
    destinationAccountNumber: [
      required('Destination account number'),
      isNumber('Destination account number'),
    ],
  },
};

export const addBankAccountSchema: RequestSchema = {
  body: {
    accountNumber: [required('Account number'), matches(/^\d{10}$/, 'Account number')],
    bankCode: [required('Bank code')],
  },
};

export const withdrawSchema: RequestSchema = {
  body: {
    amount: [required('Amount'), isNumber('Amount'), min(100, 'Amount'), max(1000000, 'Amount')],
    bankAccountId: [required('Bank account id')],
  },
};
