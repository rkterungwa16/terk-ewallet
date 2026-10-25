import { useAuth } from '../../hooks/useAuth';
import { nairaFormatter } from '../../utils/format';
import { Card } from '../ui/Card';

/** Compact balance tile for the money-movement pages. */
export function BalanceSnapshot({ className }: { className?: string }) {
  const auth = useAuth();
  if (auth.state.status !== 'authenticated') return null;
  const { customer } = auth.state;

  return (
    <Card title="Available balance" className={className}>
      <p className="stat__value stat__value--money">{nairaFormatter.format(customer.balanceNaira)}</p>
      <p className="stat__caption">Account {customer.accountNumber}</p>
    </Card>
  );
}
