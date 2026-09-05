import { useActionState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../api/client';
import type { LoginPayload } from '../../api/endpoints';
import type { FormState } from '../../types/forms';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

const initialState: FormState<LoginPayload> = { status: 'idle' };

/**
 * EXACT REACT API FOR THE JOB: useActionState (React 19, stable — this is
 * not experimental here).
 *
 * Before this hook existed, a form like this needed three separate pieces
 * of `useState` (isSubmitting, errorMessage, and — if you wanted to reset
 * the inputs on success — a key to force remount), wired together by hand
 * in an onSubmit handler that had to remember to setIsSubmitting(true),
 * try/catch, and setIsSubmitting(false) in the right order every time.
 * `useActionState` bundles exactly that lifecycle: it takes an async
 * "action" function, gives back the action's last returned state, a
 * `formAction` to hand straight to `<form action={...}>`, and an
 * `isPending` boolean React derives for you from the in-flight promise —
 * so there's no separate isSubmitting state to forget to reset, including
 * on the early-return/error path.
 */
export function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState<FormState<LoginPayload>, FormData>(
    async (_previousState, formData) => {
      const payload: LoginPayload = {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      };

      try {
        await auth.login(payload);
        navigate('/', { replace: true });
        return { status: 'success' };
      } catch (err) {
        // TYPE NARROWING on a caught `unknown`: only an ApiError carries
        // field-level validation errors; anything else (a network failure,
        // an unexpected exception) falls back to a plain message.
        if (err instanceof ApiError) {
          return { status: 'error', message: err.message };
        }
        return { status: 'error', message: 'Unable to sign in. Please try again.' };
      }
    },
    initialState,
  );

  return (
    <form action={formAction} className="auth-form">
      {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
      <Field<LoginPayload> name="email" label="Email" type="email" required autoComplete="email" />
      <Field<LoginPayload> name="password" label="Password" type="password" required autoComplete="current-password" />
      <Button type="submit" pending={isPending}>
        Sign in
      </Button>
    </form>
  );
}
