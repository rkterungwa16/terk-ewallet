import type { Transaction, TransactionOperation } from '../types/domain';

/**
 * GENERICS aren't only for hooks/components — this plain function is
 * generic over the item type `T` so the exact same slicing logic works for
 * transactions today and for, say, a future bank-accounts table without
 * being copy-pasted or written against `unknown[]`.
 */
export function paginate<T>(items: readonly T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export type OperationFilter = TransactionOperation | 'all';

export function filterTransactions(
  transactions: readonly Transaction[],
  searchTerm: string,
  operation: OperationFilter,
): Transaction[] {
  const term = searchTerm.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const matchesOperation = operation === 'all' || transaction.operation === operation;
    if (!matchesOperation) return false;
    if (!term) return true;

    return (
      transaction.reference.toLowerCase().includes(term)
      || String(transaction.accountNumber).includes(term)
      || String(transaction.destinationAccountNumber ?? '').includes(term)
    );
  });
}
