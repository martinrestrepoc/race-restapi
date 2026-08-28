import { useEffect, useRef } from 'react';

export function SubmissionError({
  message,
}: {
  message?: string | null | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div
      className="rounded-md border border-destructive/35 bg-destructive/8 p-3 text-sm text-destructive"
      ref={ref}
      role="alert"
      tabIndex={-1}
    >
      {message}
    </div>
  );
}
