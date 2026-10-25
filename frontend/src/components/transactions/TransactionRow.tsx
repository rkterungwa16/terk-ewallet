import { memo } from 'react';
import type { Transaction, TransactionStatus } from '../../types/domain';
import { dateFormatter, signedNairaFormatter } from '../../utils/format';
import { Icon, type IconName } from '../ui/Icon';

// Each state gets its own icon as well as its own color, so status never
// depends on color alone.
const STATUS: Record<TransactionStatus, { label: string; icon: IconName }> = {
  success: { label: 'Completed', icon: 'check' },
  pending: { label: 'Pending', icon: 'clock' },
  failed: { label: 'Failed', icon: 'alert' },
};

function describe(transaction: Transaction): { title: string; icon: IconName } {
  const isCredit = transaction.amountNaira > 0;
  switch (transaction.operation) {
    case 'deposit':
      return { title: 'Wallet funded', icon: 'downLeft' };
    case 'withdrawal':
      return { title: 'Withdrawal to bank', icon: 'withdraw' };
    case 'reversal':
      return { title: 'Reversal', icon: 'reverse' };
    case 'transfer':
      if (isCredit) return { title: 'Transfer received', icon: 'downLeft' };
      return {
        title: transaction.destinationAccountNumber
          ? `Transfer to ${transaction.destinationAccountNumber}`
          : 'Transfer sent',
        icon: 'transfer',
      };
  }
}

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
export const TransactionRow = memo(function TransactionRow({
  transaction,
}: {
  transaction: Transaction;
}) {
  const isCredit = transaction.amountNaira > 0;
  const { title, icon } = describe(transaction);
  const status = STATUS[transaction.status];
  const amountClass = [
    'amount',
    isCredit && 'amount--credit',
    transaction.status === 'failed' && 'amount--void',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className="transaction-row">
      <span
        className={`transaction-row__icon${isCredit ? ' transaction-row__icon--credit' : ''}`}
        aria-hidden="true"
      >
        <Icon name={icon} />
      </span>
      <div className="transaction-row__main">
        <strong className="transaction-row__title">{title}</strong>
        <span className="transaction-row__meta">
          <time dateTime={transaction.createdAt}>
            {dateFormatter.format(new Date(transaction.createdAt))}
          </time>
          {' · '}
          <span className="transaction-row__reference">{transaction.reference}</span>
        </span>
      </div>
      <div className="transaction-row__end">
        <span className={amountClass}>{signedNairaFormatter.format(transaction.amountNaira)}</span>
        <span className={`status status--${transaction.status}`}>
          <Icon name={status.icon} />
          {status.label}
        </span>
      </div>
    </li>
  );
});
