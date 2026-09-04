import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

interface PanelProps {
  action?: ReactNode;
  allowOverflow?: boolean;
  children: ReactNode;
  description?: string;
  title: string;
}

export function Panel({
  action,
  allowOverflow = false,
  children,
  description,
  title,
}: PanelProps) {
  return (
    <section
      className={cx(
        'rounded-xl border border-border bg-card',
        allowOverflow ? 'overflow-visible' : 'overflow-hidden',
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
