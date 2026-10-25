import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApiRequest } from '../hooks/useApiRequest';
import { walletApi } from '../api/endpoints';
import { isError, isSuccess } from '../types/async';
import { greeting, longDateFormatter, wholeNairaFormatter } from '../utils/format';
import {
  downloadCsv,
  monthlyTotals,
  transactionsToCsv,
  weeklySpending,
} from '../utils/insights';
import { BalanceCard } from '../components/wallet/BalanceCard';
import { TransactionList } from '../components/transactions/TransactionList';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { PayoutAccountCard } from '../components/dashboard/PayoutAccountCard';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { Icon, type IconName } from '../components/ui/Icon';

const RECENT_COUNT = 5;
// Same window the Transactions page loads: enough to cover this month and
// last month for the summary tiles in a demo-sized dataset.
const INSIGHT_WINDOW = 200;

interface MetricCardProps {
  icon: IconName;
  label: string;
  value?: string;
  note?: string;
  noteTone?: 'good' | 'neutral';
}

function MetricCard({ icon, label, value, note, noteTone = 'neutral' }: MetricCardProps) {
  return (
    <section className="card metric">
      <span className="metric__icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h2 className="metric__label">{label}</h2>
      <p className="metric__value">{value ?? '—'}</p>
      {note && <p className={`metric__note metric__note--${noteTone}`}>{note}</p>}
    </section>
  );
}

function changeNote(changePercent: number | undefined, direction: 'in' | 'out') {
  if (changePercent === undefined) return { note: 'Nothing to compare with last month' };
  const rounded = Math.abs(changePercent).toFixed(1);
  const less = changePercent < 0;
  return {
    note: `${rounded}% ${less ? 'less' : 'more'} than last month`,
    // Spending less, or receiving more, is the good direction.
    noteTone: (direction === 'out' ? less : !less) ? ('good' as const) : ('neutral' as const),
  };
}

export default function DashboardPage() {
  const auth = useAuth();

  // Stable fetcher identity (empty deps) so useApiRequest's effect only
  // runs once on mount rather than on every DashboardPage render.
  const fetchTransactions = useCallback(
    (signal: AbortSignal) => walletApi.transactions({ perPage: INSIGHT_WINDOW }, signal),
    [],
  );
  const { state: transactionsState } = useApiRequest(fetchTransactions, []);
  const transactions = isSuccess(transactionsState) ? transactionsState.data : undefined;

  const insights = useMemo(() => {
    if (!transactions) return undefined;
    return {
      spent: monthlyTotals(transactions, 'out'),
      received: monthlyTotals(transactions, 'in'),
      week: weeklySpending(transactions),
      recent: transactions.slice(0, RECENT_COUNT),
    };
  }, [transactions]);

  if (auth.state.status !== 'authenticated') return null;
  const { customer } = auth.state;
  const firstName = customer.name?.split(' ')[0];

  const spentNote = insights && changeNote(insights.spent.changePercent, 'out');
  const receivedNote = insights && changeNote(insights.received.changePercent, 'in');

  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="page-heading__eyebrow">Your finances at a glance</p>
          <h1 className="page-heading__title">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <p className="page-heading__date">{longDateFormatter.format(new Date())}</p>
      </header>

      <div className="dashboard-grid">
        <BalanceCard customer={customer} className="dashboard-grid__balance" />

        <div className="dashboard-grid__metrics">
          <MetricCard
            icon="trend"
            label="Spent this month"
            value={insights && wholeNairaFormatter.format(insights.spent.thisMonth)}
            {...spentNote}
          />
          <MetricCard
            icon="downLeft"
            label="Received this month"
            value={insights && wholeNairaFormatter.format(insights.received.thisMonth)}
            {...receivedNote}
          />
        </div>

        <section className="card transactions-card dashboard-grid__main">
          <header className="transactions-card__header">
            <div>
              <h2 className="card__title">Recent transactions</h2>
              <p className="card__subtitle">Track money moving in and out</p>
            </div>
            <Link to="/transactions" className="text-link">
              View all ↗
            </Link>
          </header>
          <div className="transactions-card__body">
            {insights && <TransactionList transactions={insights.recent} />}
            {transactionsState.status === 'loading' && <Spinner label="Loading transactions…" />}
            {isError(transactionsState) && (
              <Alert variant="error">{transactionsState.error.message}</Alert>
            )}
          </div>
          {transactions && transactions.length > 0 && (
            <footer className="transactions-card__footer">
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={() => downloadCsv('wallet-transactions.csv', transactionsToCsv(transactions))}
              >
                <Icon name="download" />
                Export activity (CSV)
              </button>
            </footer>
          )}
        </section>

        <div className="dashboard-grid__side">
          <section className="card">
            <header className="card__header">
              <div>
                <h2 className="card__title">Spending overview</h2>
                <p className="card__subtitle">Settled money out, by day</p>
              </div>
            </header>
            {insights ? <SpendingChart days={insights.week} /> : <Spinner label="Loading…" />}
          </section>

          <PayoutAccountCard accounts={customer.bankAccounts} />
        </div>
      </div>
    </div>
  );
}
