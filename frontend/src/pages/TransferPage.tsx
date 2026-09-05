import { TransferForm } from '../components/wallet/TransferForm';
import { Card } from '../components/ui/Card';

export default function TransferPage() {
  return (
    <div className="narrow-page">
      <Card title="Transfer to another wallet">
        <TransferForm />
      </Card>
    </div>
  );
}
