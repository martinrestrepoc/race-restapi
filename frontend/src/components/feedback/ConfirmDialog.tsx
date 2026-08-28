import { TriangleAlert, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  confirmLabel: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  busy?: boolean;
}

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  confirmLabel,
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
  busy = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      confirmStartedRef.current = false;
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!busy) confirmStartedRef.current = false;
  }, [busy]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl shadow-black/50"
        ref={dialogRef}
        role="alertdialog"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold" id={titleId}>
              {title}
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-muted-foreground"
              id={descriptionId}
            >
              {description}
            </p>
          </div>
          <Button
            aria-label="Cerrar confirmación"
            className="-mr-2 -mt-2"
            onClick={onCancel}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            disabled={busy}
            onClick={onCancel}
            ref={cancelButtonRef}
            variant="secondary"
          >
            Volver
          </Button>
          <Button
            aria-busy={busy}
            disabled={busy}
            onClick={() => {
              if (busy || confirmStartedRef.current) return;
              confirmStartedRef.current = true;
              onConfirm();
            }}
            variant="danger"
          >
            {busy ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
