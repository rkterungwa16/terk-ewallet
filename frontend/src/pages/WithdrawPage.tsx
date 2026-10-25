import { Link } from 'react-router-dom';
import { WithdrawForm } from '../components/wallet/WithdrawForm';
import { BalanceSnapshot } from '../components/wallet/BalanceSnapshot';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export default function WithdrawPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Move money"
        title="Withdraw"
        description="Move money from your wallet to a saved bank account."
      />
      <div className="bento bento--form">
        <Card title="Withdrawal details" className="bento__form">
          <WithdrawForm />
        </Card>
        <div className="bento__aside">
          <BalanceSnapshot />
          <Card title="Destination accounts">
            <ul className="info-list">
              <li>Withdrawals go to bank accounts you&apos;ve saved.</li>
              <li>
                <Link to="/bank-accounts">Manage bank accounts</Link>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
