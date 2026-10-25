import { Link } from 'react-router-dom';
import type { BankAccountSummary } from '../../types/domain';

/**
 * The wallet has no payment cards, so this tile shows what does exist in
 * the same visual slot: the bank account withdrawals are paid out to.
 */
export function PayoutAccountCard({ accounts }: { accounts: BankAccountSummary[] }) {
  const [primary] = accounts;

  return (
    <section className="card payout" aria-label="Withdrawal account">
      {primary ? (
        <div className="payout__visual">
          <div className="payout__top">
            <span>WITHDRAWAL ACCOUNT</span>
            <span className="payout__chip" aria-hidden="true" />
          </div>
          <p className="payout__number">
            <span aria-hidden="true">•••• •••• </span>
            <span className="sr-only">Account ending </span>
            {primary.accountNumber.slice(-4)}
          </p>
          <div className="payout__owner">
            <div>
              <small>Account name</small>
              <strong>{primary.accountName}</strong>
            </div>
            <div className="payout__bank">{primary.bankName}</div>
          </div>
        </div>
      ) : (
        <div className="payout__visual payout__visual--empty">
          <p>No bank account saved yet.</p>
          <p>Add one to withdraw your balance.</p>
        </div>
      )}
      <div className="payout__manage">
        <span>
          {accounts.length === 0
            ? 'Required for withdrawals'
            : `${accounts.length} saved account${accounts.length === 1 ? '' : 's'}`}
        </span>
        <Link to="/bank-accounts" className="text-link">
          {accounts.length === 0 ? 'Add account ↗' : 'Manage ↗'}
        </Link>
      </div>
    </section>
  );
}
