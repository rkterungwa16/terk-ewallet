import { useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApiRequest } from '../hooks/useApiRequest';
import { walletApi } from '../api/endpoints';
import { isError, isSuccess } from '../types/async';
import { BalanceCard } from '../components/wallet/BalanceCard';
import { TransactionList } from '../components/transactions/TransactionList';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';

export default function DashboardPage() {
  const auth = useAuth();

  // Stable fetcher identity (empty deps) so useApiRequest's effect only
  // runs once on mount rather than on every DashboardPage render.
  const fetchRecent = useCallback((signal: AbortSignal) => walletApi.transactions({ perPage: 5 }, signal), []);
  const { state: transactionsState } = useApiRequest(fetchRecent, []);

  if (auth.state.status !== 'authenticated') return null;
  const { customer } = auth.state;

  return (
    <div className="dashboard-page">
      <BalanceCard customer={customer} />

      <Card title="Recent activity">
        {isSuccess(transactionsState) && <TransactionList transactions={transactionsState.data} />}
        {transactionsState.status === 'loading' && <Spinner label="Loading transactions…" />}
        {isError(transactionsState) && <Alert variant="error">{transactionsState.error.message}</Alert>}
      </Card>
    </div>
  );
}
