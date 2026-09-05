import type { ReactNode } from 'react';

type AlertVariant = 'success' | 'error' | 'info';

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
}

// A small `Record<AlertVariant, string>` — a built-in UTILITY TYPE — maps
// each variant to its icon. Because the key type is the `AlertVariant`
// union, TypeScript requires every variant to have an entry: add a new
// variant to the union and forget to add it here, and this literal fails
// to compile. This is the same "can't forget a case" guarantee the
// `assertNever` pattern gives switch statements, applied to a lookup table
// instead.
const ICONS: Record<AlertVariant, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

/**
 * This is the app's other flavor of "polymorphism": rather than a class
 * hierarchy (`class ErrorAlert extends Alert`), one component changes its
 * rendering based on a piece of data (`variant`). This is the idiomatic
 * React approach — composition and data, not inheritance — and it's why
 * this codebase doesn't use `class` components or subtype polymorphism
 * anywhere: generics (parametric polymorphism, see Field.tsx/Select.tsx)
 * and variant props (data-driven rendering, here) cover every case a class
 * hierarchy would have, without the rigidity of a fixed inheritance tree.
 */
export function Alert({ variant, children }: AlertProps) {
  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="alert__icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <span>{children}</span>
    </div>
  );
}
