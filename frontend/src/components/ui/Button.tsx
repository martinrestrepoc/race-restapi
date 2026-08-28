import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cx } from '@/lib/cx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/45',
  secondary:
    'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/75',
  danger:
    'bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/45',
  ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
  icon: 'size-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) {
    return (
      <button
        className={cx(
          'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  },
);
