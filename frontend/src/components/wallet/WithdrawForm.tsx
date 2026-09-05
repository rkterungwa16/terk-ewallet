import { useActionState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { walletApi, type WithdrawPayload } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { FormState } from '../../types/forms';
import { Field } from '../ui/Field';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';

const initialState: FormState<WithdrawPayload> = { status: 'idle' };

export function WithdrawForm() {
  const auth = useAuth();
  if (auth.state.status !== 'authenticated') return null;
  const { customer } = auth.state;

  const [state, formAction, isPending] = useActionState<FormState<WithdrawPayload>, FormData>(
    async (_previousState, formData) => {
      const payload: WithdrawPayload = {
        amount: Number(formData.get('amount')),
        bankAccountId: String(formData.get('bankAccountId') ?? ''),
      };

      try {
        const result = await walletApi.withdraw(payload);
        auth.updateCustomer(result.customer);
        return { status: 'success' };
      } catch (err) {
        return {
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Withdrawal failed. Please try again.',
        };
      }
    },
    initialState,
  );

  if (customer.bankAccounts.length === 0) {
    return (
      <EmptyState
        title="No bank accounts yet"
        description="Add a bank account first so we know where to send your withdrawal."
      />
    );
  }

  return (
    <form action={formAction} className="auth-form">
      {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
      {state.status === 'success' && <Alert variant="success">Withdrawal requested.</Alert>}
      <Select
        label="Payout account"
        name="bankAccountId"
        required
        options={customer.bankAccounts.map((account) => ({
          value: account.id,
          label: `${account.accountName} · ${account.bankName} · ${account.accountNumber}`,
        }))}
      />
      <Field<WithdrawPayload> name="amount" label="Amount (₦)" type="number" min={1} step={0.01} required />
      <Button type="submit" variant="secondary" pending={isPending}>
        Withdraw
      </Button>
    </form>
  );
}
