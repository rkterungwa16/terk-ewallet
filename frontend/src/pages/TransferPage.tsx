import { TransferForm } from '../components/wallet/TransferForm';
import { BalanceSnapshot } from '../components/wallet/BalanceSnapshot';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export default function TransferPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Move money"
        title="Transfer"
        description="Send money instantly to another wallet using its account number."
      />
      <div className="bento bento--form">
        <Card title="Transfer details" className="bento__form">
          <TransferForm />
        </Card>
        <div className="bento__aside">
          <BalanceSnapshot />
          <Card title="Good to know">
            <ul className="info-list">
              <li>Transfers between wallets settle immediately.</li>
              <li>The minimum transfer is ₦10.</li>
              <li>Double-check the account number before you send.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
