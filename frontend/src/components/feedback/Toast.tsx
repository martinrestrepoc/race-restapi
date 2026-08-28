import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

type ToastTone = 'success' | 'info' | 'danger';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  title: string;
  tone?: ToastTone;
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-success/40 text-success',
  info: 'border-info/40 text-info',
  danger: 'border-destructive/40 text-destructive',
};

const icons = {
  success: CheckCircle2,
  info: Info,
  danger: TriangleAlert,
};

export function Toast({
  message,
  onDismiss,
  title,
  tone = 'success',
}: ToastProps) {
  const Icon = icons[tone];

  return (
    <aside
      aria-atomic="true"
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      className={cx(
        'fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-lg border bg-card p-4 shadow-2xl shadow-black/40',
        toneStyles[tone],
      )}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 text-foreground">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {message}
        </p>
      </div>
      <Button
        aria-label="Cerrar notificación"
        className="-mr-2 -mt-2"
        onClick={onDismiss}
        size="icon"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </aside>
  );
}
