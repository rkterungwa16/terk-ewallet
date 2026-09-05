import { useActionState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { walletApi, type AddBankAccountPayload } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import { isSuccess } from '../../types/async';
import type { FormState } from '../../types/forms';
import { Field } from '../ui/Field';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Spinner } from '../ui/Spinner';

const initialState: FormState<AddBankAccountPayload> = { status: 'idle' };

export function BankAccountForm() {
  const auth = useAuth();

  // `walletApi.banks` already has the right signature `(signal) =>
  // Promise<Bank[]>` for useApiRequest, but wrapping it in useCallback with
  // an empty dependency array (rather than passing the reference straight
  // through) guarantees its identity never changes across renders — see
  // useApiRequest's effect, which depends on this to only fetch once.
  const fetchBanks = useCallback((signal: AbortSignal) => walletApi.banks(signal), []);
  const { state: banksState } = useApiRequest(fetchBanks, []);

  const [state, formAction, isPending] = useActionState<FormState<AddBankAccountPayload>, FormData>(
    async (_previousState, formData) => {
      const payload: AddBankAccountPayload = {
        accountNumber: String(formData.get('accountNumber') ?? ''),
        bankCode: String(formData.get('bankCode') ?? ''),
      };

      try {
        const customer = await walletApi.addBankAccount(payload);
        auth.updateCustomer(customer);
        return { status: 'success' };
      } catch (err) {
        return {
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Could not verify that account. Please check the details.',
        };
      }
    },
    initialState,
  );

  if (!isSuccess(banksState)) {
    return banksState.status === 'error' ? (
      <Alert variant="error">Could not load the list of banks.</Alert>
    ) : (
      <Spinner label="Loading banks…" />
    );
  }

  return (
    <form action={formAction} className="auth-form">
      {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
      {state.status === 'success' && <Alert variant="success">Bank account added.</Alert>}
      <Select
        label="Bank"
        name="bankCode"
        required
        options={banksState.data.map((bank) => ({ value: bank.code, label: bank.name }))}
      />
      <Field<AddBankAccountPayload> name="accountNumber" label="Account number" required />
      <Button type="submit" pending={isPending}>
        Add bank account
      </Button>
    </form>
  );
}
