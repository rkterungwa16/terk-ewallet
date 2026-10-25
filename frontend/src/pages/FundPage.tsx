import { FundWalletForm } from '../components/wallet/FundWalletForm';
import { BalanceSnapshot } from '../components/wallet/BalanceSnapshot';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export default function FundPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Move money"
        title="Fund wallet"
        description="Top up your balance with a card or bank payment."
      />
      <div className="bento bento--form">
        <Card title="Amount" className="bento__form">
          <FundWalletForm />
        </Card>
        <div className="bento__aside">
          <BalanceSnapshot />
          <Card title="How it works">
            <ul className="info-list">
              <li>You&apos;ll be redirected to Paystack to complete payment.</li>
              <li>Once Paystack confirms, you&apos;re brought back and your wallet is credited.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
