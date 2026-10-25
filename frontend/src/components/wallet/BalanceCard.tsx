import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Customer } from '../../types/domain';
import { nairaFormatter } from '../../utils/format';
import { Icon } from '../ui/Icon';

interface BalanceCardProps {
  customer: Customer;
  className?: string;
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
export const BalanceCard = memo(function BalanceCard({ customer, className }: BalanceCardProps) {
  return (
    <section
      className={['card', 'balance-card', className].filter(Boolean).join(' ')}
      aria-labelledby="balance-card-title"
    >
      <div className="balance-card__top">
        <h2 id="balance-card-title" className="balance-card__label">
          <Icon name="wallet" />
          Available balance
        </h2>
        <span className="balance-card__pill">Acct {customer.accountNumber}</span>
      </div>

      <p className="balance-card__amount">{nairaFormatter.format(customer.balanceNaira)}</p>
      <p className="balance-card__caption">Ready to spend, send or withdraw</p>

      <div className="balance-card__actions">
        <Link to="/transfer" className="btn btn--primary">
          <Icon name="arrowUp" />
          Send money
        </Link>
        <Link to="/fund" className="btn btn--light">
          <Icon name="plus" />
          Add money
        </Link>
        <Link to="/withdraw" className="btn btn--light">
          <Icon name="withdraw" />
          Withdraw
        </Link>
      </div>

      <p className="balance-card__footnote">
        <span>Account name</span>
        <strong>{customer.name ?? customer.email}</strong>
      </p>
    </section>
  );
});
