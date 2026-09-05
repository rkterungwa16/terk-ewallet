import { memo } from 'react';
import type { Transaction } from '../../types/domain';

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  signDisplay: 'always',
});

const dateFormatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * PERFORMANCE: React.memo on a list row.
 * TransactionList can re-render for reasons that don't touch any single
 * row's data — a filter changing which rows are *included*, a page change,
 * a sibling component's state update bubbling through a shared parent.
 * Wrapping the row in `memo` means React can skip re-rendering (and
 * re-diffing) rows whose own `transaction` prop is referentially unchanged,
 * which matters more as the list grows — this is the same principle a
 * virtualization library builds on, just without the added complexity of
 * windowing, which this dataset size doesn't yet need.
 */
export const TransactionRow = memo(function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.amountNaira > 0;

  return (
    <tr className="transaction-row">
      <td>{dateFormatter.format(new Date(transaction.createdAt))}</td>
      <td className="transaction-row__operation">{transaction.operation}</td>
      <td>
        <span className={`badge badge--${transaction.status}`}>{transaction.status}</span>
      </td>
      <td className={isCredit ? 'transaction-row__amount--credit' : 'transaction-row__amount--debit'}>
        {nairaFormatter.format(transaction.amountNaira)}
      </td>
      <td className="transaction-row__reference">{transaction.reference}</td>
    </tr>
  );
});
