import { useActionState } from 'react';
import { walletApi, type InitializeFundingPayload } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { FormState } from '../../types/forms';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const initialState: FormState<InitializeFundingPayload> = { status: 'idle' };

export function FundWalletForm() {
  const [state, formAction, isPending] = useActionState<FormState<InitializeFundingPayload>, FormData>(
    async (_previousState, formData) => {
      const amount = Number(formData.get('amount'));

      try {
        const { authorizationUrl } = await walletApi.initializeFunding({ amount });
        // Hand off to Paystack's hosted checkout. The wallet is credited
        // once Paystack confirms the charge — see FundCallbackPage, which
        // handles the redirect back and/or the charge.success webhook on
        // the backend, whichever resolves first.
        window.location.href = authorizationUrl;
        return { status: 'success' };
      } catch (err) {
        return {
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Could not start payment. Please try again.',
        };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="auth-form">
      {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
      <Field<InitializeFundingPayload> name="amount" label="Amount (₦)" type="number" min={1} step={0.01} required />
      <Button type="submit" pending={isPending}>
        Continue to payment
      </Button>
    </form>
  );
}
