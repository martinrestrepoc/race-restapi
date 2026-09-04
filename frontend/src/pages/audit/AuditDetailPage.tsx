import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { useApi } from '@/api/use-api';
import { ErrorState, LoadingState } from '@/components/feedback/FeedbackState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { queryKeys } from '@/query/query-keys';
import { formatDateTime } from '@/pages/races/race-view';
import { auditLabel } from './audit-view';

export function AuditDetailPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const audit = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.audit.detail(id, signal),
    queryKey: queryKeys.audit.detail(id),
  });
  if (audit.isPending) return <LoadingState />;
  if (audit.isError)
    return (
      <ErrorState
        description="No fue posible consultar el evento."
        onRetry={() => void audit.refetch()}
        title="Error al cargar"
      />
    );
  const entry = audit.data;
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to="/audit"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver
          </Link>
        }
        description={`Cambio registrado el ${formatDateTime(entry.occurredAt)}.`}
        eyebrow="Historial"
        title={auditLabel(entry.action)}
      />
      <Panel title="Información del cambio">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Datum label="Ocurrencia" value={formatDateTime(entry.occurredAt)} />
          <Datum label="Elemento" value={auditLabel(entry.entityType)} />
          <Datum
            label="Realizado por"
            value={entry.actorUserProfileId ? 'Usuario' : 'Sistema'}
          />
        </dl>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <JsonSnapshot label="Valores anteriores" value={entry.previousValues} />
        <JsonSnapshot label="Valores nuevos" value={entry.newValues} />
      </div>
    </div>
  );
}

function JsonSnapshot({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  return (
    <Panel title={label}>
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 text-muted-foreground">
        {value
          ? JSON.stringify(removeInternalIdentifiers(value), null, 2)
          : 'Sin valores'}
      </pre>
    </Panel>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}

function removeInternalIdentifiers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeInternalIdentifiers);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/(^id$|ids$|id$)/i.test(key))
      .map(([key, item]) => [key, removeInternalIdentifiers(item)]),
  );
}
