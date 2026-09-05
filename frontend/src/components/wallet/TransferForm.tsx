import { useActionState, useOptimistic } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { walletApi, type InternalTransferPayload } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { FormState } from '../../types/forms';
import type { Customer } from '../../types/domain';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const initialState: FormState<InternalTransferPayload> = { status: 'idle' };

const nairaFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

export function TransferForm() {
  const auth = useAuth();

  // TYPE NARROWING on our own discriminated union: TransferForm only
  // renders behind a route guard that already requires an authenticated
  // session (see components/layout/ProtectedRoute.tsx), but the *type* of
  // `auth.state` is still the full `AuthState` union until we check it
  // here. This `if` is what lets everything below treat `auth.state` as
  // the `{ status: 'authenticated'; customer: Customer }` branch — try
  // deleting it and `auth.state.customer` stops compiling.
  if (auth.state.status !== 'authenticated') return null;
  const { customer } = auth.state;

  return <TransferFormInner customer={customer} updateCustomer={auth.updateCustomer} />;
}

function TransferFormInner({
  customer,
  updateCustomer,
}: {
  customer: Customer;
  updateCustomer: (customer: Customer) => void;
}) {
  /**
   * EXACT REACT API FOR THE JOB: useOptimistic (React 19, stable).
   *
   * A transfer's server round-trip can take a moment; without this, the
   * displayed balance sits frozen at its pre-transfer value for that whole
   * window, which reads as "did my click even register?". useOptimistic
   * lets us render a *guessed* next state (`customer` minus the amount
   * being sent) the instant the action starts, then automatically
   * reconciles back to whatever `customer` (the real prop) becomes once the
   * action finishes — success or failure. We don't have to manually revert
   * it on error: because the optimistic value is derived from `customer` on
   * every render, once the action ends and `customer` hasn't actually
   * changed (the failure path never calls `updateCustomer`), the optimistic
   * value naturally falls back to the real one.
   */
  const [optimisticCustomer, setOptimisticAmount] = useOptimistic<Customer, number>(
    customer,
    (currentCustomer, amountNaira) => ({
      ...currentCustomer,
      balanceNaira: currentCustomer.balanceNaira - amountNaira,
      balanceKobo: currentCustomer.balanceKobo - Math.round(amountNaira * 100),
    }),
  );

  const [state, formAction, isPending] = useActionState<FormState<InternalTransferPayload>, FormData>(
    async (_previousState, formData) => {
      const amount = Number(formData.get('amount'));
      const destinationAccountNumber = Number(formData.get('destinationAccountNumber'));

      // useOptimistic updates must happen inside the transition
      // useActionState already wraps this action in — calling
      // setOptimisticAmount here (rather than in an onClick outside the
      // action) is what makes the optimistic value visible immediately
      // while `isPending` is true.
      setOptimisticAmount(amount);

      try {
        const result = await walletApi.transfer({ destinationAccountNumber, amount });
        updateCustomer(result.customer);
        return { status: 'success' };
      } catch (err) {
        return {
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Transfer failed. Please try again.',
        };
      }
    },
    initialState,
  );

  return (
    <div className="transfer-form">
      <p className="transfer-form__preview">
        Balance after this transfer:{' '}
        <strong>{nairaFormatter.format(optimisticCustomer.balanceNaira)}</strong>
      </p>
      <form action={formAction} className="auth-form">
        {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
        {state.status === 'success' && <Alert variant="success">Transfer sent.</Alert>}
        <Field<InternalTransferPayload>
          name="destinationAccountNumber"
          label="Destination account number"
          type="number"
          required
        />
        <Field<InternalTransferPayload> name="amount" label="Amount (₦)" type="number" min={10} step={0.01} required />
        <Button type="submit" pending={isPending}>
          Send transfer
        </Button>
      </form>
    </div>
  );
}
