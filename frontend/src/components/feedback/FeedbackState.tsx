import {
  Ban,
  Inbox,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface EmptyStateProps {
  description: string;
  title: string;
}

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <StateContainer>
      <Inbox aria-hidden="true" className="size-9 text-muted-foreground" />
      <StateCopy description={description} title={title} />
    </StateContainer>
  );
}

interface ErrorStateProps extends EmptyStateProps {
  onRetry?: () => void;
}

export function ErrorState({ description, onRetry, title }: ErrorStateProps) {
  return (
    <StateContainer tone="danger">
      <TriangleAlert aria-hidden="true" className="size-9 text-destructive" />
      <StateCopy description={description} title={title} />
      {onRetry ? (
        <Button onClick={onRetry} size="sm" variant="secondary">
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      ) : null}
    </StateContainer>
  );
}

export function DisabledState({ description, title }: EmptyStateProps) {
  return (
    <StateContainer>
      <Ban aria-hidden="true" className="size-9 text-muted-foreground" />
      <StateCopy description={description} title={title} />
    </StateContainer>
  );
}

export function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Cargando contenido" className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div className="flex items-center gap-3" key={item}>
          <Skeleton className="size-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Cargando información…
      </p>
    </div>
  );
}

interface StateContainerProps {
  children: ReactNode;
  tone?: 'default' | 'danger';
}

function StateContainer({ children, tone = 'default' }: StateContainerProps) {
  return (
    <div
      className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border px-5 py-10 text-center ${
        tone === 'danger'
          ? 'border-destructive/35 bg-destructive/8'
          : 'border-dashed border-border bg-background/35'
      }`}
    >
      {children}
    </div>
  );
}

function StateCopy({ description, title }: EmptyStateProps) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
