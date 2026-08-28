import { cloneElement, isValidElement, type ReactNode } from 'react';

interface AccessibleControlProps {
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | 'false' | 'true' | undefined;
  'aria-required'?: boolean | 'false' | 'true' | undefined;
}

interface FormFieldProps {
  children: ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  htmlFor: string;
  label: string;
  required?: boolean;
}

export function FormField({
  children,
  error,
  hint,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  const descriptionId = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;
  const control = isValidElement<AccessibleControlProps>(children)
    ? cloneElement(children, {
        'aria-describedby': children.props['aria-describedby'] ?? descriptionId,
        'aria-invalid': children.props['aria-invalid'] ?? Boolean(error),
        'aria-required': children.props['aria-required'] ?? required,
      })
    : children;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" htmlFor={htmlFor}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-primary">
              *
            </span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        ) : null}
      </label>
      <div>{control}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-destructive" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p
          className="mt-1.5 text-xs text-muted-foreground"
          id={`${htmlFor}-hint`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const fieldControlClassName =
  'min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60';
