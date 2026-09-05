import { FundWalletForm } from '../components/wallet/FundWalletForm';
import { Card } from '../components/ui/Card';

export default function FundPage() {
  return (
    <div className="narrow-page">
      <Card title="Fund your wallet">
        <p className="page-intro">
          You&apos;ll be redirected to Paystack to complete payment, then brought back here.
        </p>
        <FundWalletForm />
      </Card>
    </div>
  );
}
