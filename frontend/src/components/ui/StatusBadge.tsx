import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type StatusBadgeTone =
  'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
}

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
