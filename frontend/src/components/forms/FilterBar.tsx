import type { ReactNode } from 'react';

interface FilterBarProps {
  actions?: ReactNode;
  children: ReactNode;
}

export function FilterBar({ actions, children }: FilterBarProps) {
  return (
    <section
      aria-label="Filtros"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:flex-row lg:items-end"
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </section>
  );
}
