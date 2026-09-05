import { useActionState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../api/client';
import type { RegisterPayload } from '../../api/endpoints';
import type { FormState } from '../../types/forms';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const initialState: FormState<RegisterPayload> = { status: 'idle' };

export function RegisterForm() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState<FormState<RegisterPayload>, FormData>(
    async (_previousState, formData) => {
      const payload: RegisterPayload = {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        name: String(formData.get('name') ?? '') || undefined,
      };

      try {
        await auth.register(payload);
        navigate('/', { replace: true });
        return { status: 'success' };
      } catch (err) {
        if (err instanceof ApiError) {
          return { status: 'error', message: err.message };
        }
        return { status: 'error', message: 'Unable to create your account. Please try again.' };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="auth-form">
      {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
      <Field<RegisterPayload> name="name" label="Full name" autoComplete="name" />
      <Field<RegisterPayload> name="email" label="Email" type="email" required autoComplete="email" />
      <Field<RegisterPayload>
        name="password"
        label="Password"
        type="password"
        required
        autoComplete="new-password"
      />
      <Button type="submit" pending={isPending}>
        Create account
      </Button>
    </form>
  );
}
