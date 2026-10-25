import { useAuth } from '../hooks/useAuth';
import { BankAccountForm } from '../components/wallet/BankAccountForm';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

export default function BankAccountsPage() {
  const auth = useAuth();
  if (auth.state.status !== 'authenticated') return null;
  const { bankAccounts } = auth.state.customer;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Account"
        title="Bank accounts"
        description="Saved accounts you can withdraw to."
      />
      <div className="bento bento--form">
        <Card title="Add a bank account" className="bento__form">
          <BankAccountForm />
        </Card>
        <div className="bento__aside">
          <Card title={`Saved accounts (${bankAccounts.length})`}>
            {bankAccounts.length === 0 ? (
              <EmptyState
                title="No bank accounts saved"
                description="Add one to enable withdrawals."
              />
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
        </div>
      </div>
    </div>
  );
}
