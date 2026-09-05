import { WithdrawForm } from '../components/wallet/WithdrawForm';
import { Card } from '../components/ui/Card';

export default function WithdrawPage() {
  return (
    <div className="narrow-page">
      <Card title="Withdraw to your bank">
        <WithdrawForm />
      </Card>
    </div>
  );
}
