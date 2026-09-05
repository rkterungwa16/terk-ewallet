import { memo } from 'react';
import type { Customer } from '../../types/domain';
import { Card } from '../ui/Card';

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});

interface BalanceCardProps {
  customer: Customer;
}

/**
 * PERFORMANCE: React.memo.
 * BalanceCard's render is cheap on its own, but it's the highest-traffic
 * component on the dashboard — every other widget on that page (recent
 * transactions, a live search box) causes DashboardPage to re-render far
 * more often than the customer's actual balance changes. Without memo,
 * BalanceCard would re-render on every one of those unrelated updates
 * purely because its parent did. `memo` makes it skip re-rendering unless
 * its own props (`customer`) actually change by shallow comparison — and
 * because `Customer` objects are only ever replaced wholesale (see
 * AuthContext's `customer_updated` action), not mutated in place, that
 * shallow comparison is reliable here.
 */
export const BalanceCard = memo(function BalanceCard({ customer }: BalanceCardProps) {
  return (
    <Card className="balance-card" title="Wallet balance">
      <p className="balance-card__amount">{nairaFormatter.format(customer.balanceNaira)}</p>
      <dl className="balance-card__meta">
        <div>
          <dt>Account number</dt>
          <dd>{customer.accountNumber}</dd>
        </div>
        <div>
          <dt>Account name</dt>
          <dd>{customer.name ?? customer.email}</dd>
        </div>
      </dl>
    </Card>
  );
});
