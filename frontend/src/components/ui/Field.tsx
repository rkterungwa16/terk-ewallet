import { useId } from 'react';
import type { FormErrors } from '../../types/utility';

/**
 * GENERICS + POLYMORPHISM (parametric, not classical/inheritance-based):
 * `Field<TValues>` isn't specialized for the login form or the transfer
 * form — it's written once and *instantiated* differently at each call
 * site (`<Field<LoginPayload> name="email" .../>`,
 * `<Field<InternalTransferPayload> name="amount" .../>`). This is the form
 * of polymorphism idiomatic to TypeScript/React: rather than a class
 * hierarchy with a base `Field` and subclasses per form, one generic
 * component adapts to whatever shape you parameterize it with, and the
 * compiler still checks every usage against that shape.
 *
 * `name: keyof TValues & string` is KEYOF applied to a generic type
 * parameter, intersected with `string` because `keyof` on an object type
 * can in principle include `number | symbol` keys too, and a form field's
 * `name` attribute has to be a string. This means `<Field<LoginPayload>
 * name="emial" />` (typo) fails to compile — `name` can only be a real key
 * of `LoginPayload`.
 */
interface FieldProps<TValues> {
  name: keyof TValues & string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number';
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  step?: number;
  autoComplete?: string;
  errors?: FormErrors<TValues>;
}

export function Field<TValues>({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  min,
  step,
  autoComplete,
  errors,
}: FieldProps<TValues>) {
  // useId: generates a stable, unique id per component instance so the
  // <label htmlFor> / <input id> pairing works correctly even when the
  // same form (and therefore the same Field) renders more than once on a
  // page, or under React 18 Strict Mode's double-invoke-in-dev behavior.
  // A hand-rolled `name + Math.random()` id would either collide across
  // instances or change every render; useId is the API React ships
  // specifically to avoid both.
  const id = useId();
  const errorMessage = errors?.[name as keyof TValues];

  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        autoComplete={autoComplete}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? `${id}-error` : undefined}
        className="field__input"
      />
      {errorMessage && (
        <span id={`${id}-error`} className="field__error" role="alert">
          {errorMessage}
        </span>
      )}
    </label>
  );
}
