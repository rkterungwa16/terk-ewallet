import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  pending?: boolean;
}

export function Button({
  variant = 'primary', pending, disabled, children, className, ...rest
}: ButtonProps) {
  return (
    <button
      className={['btn', `btn--${variant}`, className].filter(Boolean).join(' ')}
      disabled={disabled || pending}
      {...rest}
    >
      {pending ? 'Please wait…' : children}
    </button>
  );
}
