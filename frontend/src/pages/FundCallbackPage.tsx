import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApiRequest } from '../hooks/useApiRequest';
import { walletApi } from '../api/endpoints';
import { isError, isSuccess } from '../types/async';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';

export default function FundCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';
  const auth = useAuth();

  const confirm = useCallback(
    (signal: AbortSignal) => walletApi.confirmFunding(reference, signal),
    [reference],
  );
  const { state } = useApiRequest(confirm, [reference]);

  useEffect(() => {
    if (isSuccess(state)) {
      auth.updateCustomer(state.data.customer);
    }
    // auth.updateCustomer has a stable identity (see AuthContext's
    // useCallback), so it's safe to omit from deps without risking a stale
    // closure — including it would also be correct, but redundant here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="narrow-page">
      <Card title="Confirming your payment">
        {!reference && <Alert variant="error">No payment reference was provided.</Alert>}
        {reference && state.status === 'loading' && <Spinner label="Confirming with Paystack…" />}
        {reference && isError(state) && <Alert variant="error">{state.error.message}</Alert>}
        {reference && isSuccess(state) && <Alert variant="success">Your wallet has been credited.</Alert>}
        <p className="page-intro">
          <Link to="/">Back to dashboard</Link>
        </p>
      </Card>
    </div>
  );
}
