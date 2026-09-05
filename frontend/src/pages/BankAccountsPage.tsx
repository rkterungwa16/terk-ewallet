import { useAuth } from '../hooks/useAuth';
import { BankAccountForm } from '../components/wallet/BankAccountForm';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

export default function BankAccountsPage() {
  const auth = useAuth();
  if (auth.state.status !== 'authenticated') return null;
  const { bankAccounts } = auth.state.customer;

  return (
    <div className="narrow-page">
      <Card title="Your bank accounts">
        {bankAccounts.length === 0 ? (
          <EmptyState title="No bank accounts saved" description="Add one below to enable withdrawals." />
        ) : (
          <ul className="bank-account-list">
            {bankAccounts.map((account) => (
              <li key={account.id} className="bank-account-list__item">
                <span className="bank-account-list__name">{account.accountName}</span>
                <span className="bank-account-list__meta">
                  {account.bankName} · {account.accountNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Add a bank account">
        <BankAccountForm />
      </Card>
    </div>
  );
}
