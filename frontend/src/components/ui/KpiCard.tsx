import type { LucideIcon } from 'lucide-react';

import { cx } from '@/lib/cx';

interface KpiCardProps {
  accent?: boolean;
  icon: LucideIcon;
  label: string;
  value: number | string;
}

export function KpiCard({
  accent = false,
  icon: Icon,
  label,
  value,
}: KpiCardProps) {
  return (
    <article
      className={cx(
        'rounded-lg border border-border bg-card p-4',
        accent && 'ring-1 ring-primary/30',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cx(
          'size-5',
          accent ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </article>
  );
}
