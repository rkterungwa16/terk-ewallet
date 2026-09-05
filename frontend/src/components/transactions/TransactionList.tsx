import { memo } from 'react';
import type { Transaction } from '../../types/domain';
import { TransactionRow } from './TransactionRow';
import { EmptyState } from '../ui/EmptyState';

export const TransactionList = memo(function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return <EmptyState title="No transactions yet" description="Fund your wallet to get started." />;
  }

  return (
    <table className="transaction-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Status</th>
          <th>Amount</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        {/* `transaction.id` (the Mongo _id) is a stable, unique key — never
            the array index, which would misattribute state/identity across
            re-renders whenever the list is filtered, sorted, or paginated. */}
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </tbody>
    </table>
  );
});
