import { Search, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { AuditLog, AuditLogQuery } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { Toast } from '@/components/feedback/Toast';
import { FilterBar } from '@/components/forms/FilterBar';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { queryKeys } from '@/query/query-keys';
import {
  formatDateTime,
  localDateTimeToIso,
  toLocalDateTimeInput,
} from '@/pages/races/race-view';

const pageSizes = [10, 20, 50] as const;

export function AuditListPage() {
  const { resources } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readQuery(searchParams);
  const [action, setAction] = useState(query.action ?? '');
  const [entityType, setEntityType] = useState(query.entityType ?? '');
  const [actorId, setActorId] = useState(query.actorUserProfileId ?? '');
  const [entityId, setEntityId] = useState(query.entityId ?? '');
  const [from, setFrom] = useState(
    query.from ? toLocalDateTimeInput(query.from) : '',
  );
  const [to, setTo] = useState(query.to ? toLocalDateTimeInput(query.to) : '');
  const [filterError, setFilterError] = useState<string | null>(null);
  const audit = useQuery({
    queryFn: ({ signal }) => resources.audit.list(query, signal),
    queryKey: queryKeys.audit.list(query),
  });

  function applyQuery(next: AuditLogQuery) {
    const params = new URLSearchParams();
    if (next.action) params.set('action', next.action);
    if (next.entityType) params.set('entityType', next.entityType);
    if (next.actorUserProfileId)
      params.set('actorUserProfileId', next.actorUserProfileId);
    if (next.entityId) params.set('entityId', next.entityId);
    if (next.from) params.set('from', next.from);
    if (next.to) params.set('to', next.to);
    if (next.page && next.page !== 1) params.set('page', String(next.page));
    if (next.limit && next.limit !== 20)
      params.set('limit', String(next.limit));
    setSearchParams(params);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const fromIso = from ? localDateTimeToIso(from) : undefined;
    const toIso = to ? localDateTimeToIso(to) : undefined;
    if (fromIso && toIso && new Date(fromIso) > new Date(toIso)) {
      setFilterError(
        'La fecha inicial debe ser anterior o igual a la fecha final.',
      );
      return;
    }
    setFilterError(null);
    applyQuery({
      ...(action.trim() ? { action: action.trim().toUpperCase() } : {}),
      ...(actorId.trim() ? { actorUserProfileId: actorId.trim() } : {}),
      ...(entityId.trim() ? { entityId: entityId.trim() } : {}),
      ...(entityType.trim()
        ? { entityType: entityType.trim().toUpperCase() }
        : {}),
      ...(fromIso ? { from: fromIso } : {}),
      limit: query.limit,
      page: 1,
      ...(toIso ? { to: toIso } : {}),
    });
  }

  return (
    <div className="space-y-6">
      {filterError ? (
        <Toast
          message={filterError}
          onDismiss={() => setFilterError(null)}
          title="Filtros inválidos"
          tone="danger"
        />
      ) : null}
      <PageHeader
        description="Registro inmutable de operaciones relevantes. No existen controles para crear, editar o eliminar eventos."
        eyebrow="Administración"
        title="Auditoría"
      />
      <form onSubmit={submit}>
        <FilterBar
          actions={
            <Button size="sm" type="submit">
              <Search aria-hidden="true" className="size-4" />
              Aplicar
            </Button>
          }
        >
          <FormField htmlFor="audit-action" label="Acción">
            <input
              className={fieldControlClassName}
              id="audit-action"
              maxLength={100}
              onChange={(event) => setAction(event.target.value)}
              placeholder="RESULT_CORRECTED"
              value={action}
            />
          </FormField>
          <FormField htmlFor="audit-entity-type" label="Tipo de entidad">
            <input
              className={fieldControlClassName}
              id="audit-entity-type"
              maxLength={100}
              onChange={(event) => setEntityType(event.target.value)}
              placeholder="RACE_RESULT"
              value={entityType}
            />
          </FormField>
          <FormField htmlFor="audit-actor" label="ID del actor">
            <input
              className={fieldControlClassName}
              id="audit-actor"
              onChange={(event) => setActorId(event.target.value)}
              placeholder="UUID del perfil"
              value={actorId}
            />
          </FormField>
          <FormField htmlFor="audit-entity" label="ID de la entidad">
            <input
              className={fieldControlClassName}
              id="audit-entity"
              onChange={(event) => setEntityId(event.target.value)}
              placeholder="UUID"
              value={entityId}
            />
          </FormField>
          <FormField htmlFor="audit-from" label="Desde">
            <input
              className={fieldControlClassName}
              id="audit-from"
              onChange={(event) => setFrom(event.target.value)}
              type="datetime-local"
              value={from}
            />
          </FormField>
          <FormField htmlFor="audit-to" label="Hasta">
            <input
              className={fieldControlClassName}
              id="audit-to"
              onChange={(event) => setTo(event.target.value)}
              type="datetime-local"
              value={to}
            />
          </FormField>
          <FormField htmlFor="audit-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="audit-limit"
              onChange={(event) =>
                applyQuery({
                  ...query,
                  limit: Number(event.target.value),
                  page: 1,
                })
              }
              value={query.limit}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </FormField>
        </FilterBar>
      </form>
      <Panel
        action={
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {audit.data?.totalItems ?? 0} eventos
          </span>
        }
        title="Eventos registrados"
      >
        {audit.isPending ? (
          <LoadingState />
        ) : audit.isError ? (
          <ErrorState
            description="No fue posible consultar la auditoría. Revisa que los identificadores y fechas sean válidos."
            onRetry={() => void audit.refetch()}
            title="Error al cargar"
          />
        ) : audit.data.items.length === 0 ? (
          <EmptyState
            description="No existen eventos que coincidan con los filtros."
            title="Sin eventos"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Eventos de auditoría"
              columns={auditColumns}
              getRowKey={(entry) => entry.id}
              rows={audit.data.items}
            />
            <Pagination
              currentPage={audit.data.page}
              onPageChange={(page) => applyQuery({ ...query, page })}
              totalPages={audit.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

const auditColumns = [
  {
    header: 'Fecha',
    key: 'date',
    render: (entry: AuditLog) => formatDateTime(entry.occurredAt),
  },
  {
    header: 'Acción',
    key: 'action',
    render: (entry: AuditLog) => (
      <Link
        className="font-mono text-xs font-semibold text-primary hover:underline"
        to={`/audit/${entry.id}`}
      >
        {entry.action}
      </Link>
    ),
  },
  {
    header: 'Entidad',
    key: 'entity',
    render: (entry: AuditLog) => (
      <div>
        <span className="text-xs font-semibold">{entry.entityType}</span>
        <p className="max-w-48 break-all font-mono text-[11px] text-muted-foreground">
          {entry.entityId}
        </p>
      </div>
    ),
  },
  {
    header: 'Actor',
    key: 'actor',
    render: (entry: AuditLog) =>
      entry.actorUserProfileId ? (
        <Link
          className="max-w-48 break-all font-mono text-[11px] hover:text-primary"
          to={`/users/${entry.actorUserProfileId}`}
        >
          {entry.actorUserProfileId}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    header: 'Descripción',
    key: 'description',
    render: (entry: AuditLog) => entry.description ?? '—',
  },
];

function readQuery(
  params: URLSearchParams,
): Required<Pick<AuditLogQuery, 'limit' | 'page'>> & AuditLogQuery {
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const action = params.get('action')?.trim().slice(0, 100);
  const actorUserProfileId = params.get('actorUserProfileId')?.trim();
  const entityId = params.get('entityId')?.trim();
  const entityType = params.get('entityType')?.trim().slice(0, 100);
  const from = validIso(params.get('from'));
  const to = validIso(params.get('to'));
  return {
    ...(action ? { action } : {}),
    ...(actorUserProfileId ? { actorUserProfileId } : {}),
    ...(entityId ? { entityId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from ? { from } : {}),
    limit: pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
      ? limitCandidate
      : 20,
    page: safeInteger(params.get('page'), 1),
    ...(to ? { to } : {}),
  };
}

function validIso(value: string | null): string | undefined {
  return value && !Number.isNaN(new Date(value).getTime()) ? value : undefined;
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
