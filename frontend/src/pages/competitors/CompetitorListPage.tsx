import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import type {
  Competitor,
  CompetitorQuery,
  CompetitorStatus,
  CompetitorType,
} from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import { Toast } from '@/components/feedback/Toast';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { FilterBar } from '@/components/forms/FilterBar';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { queryKeys } from '@/query/query-keys';
import {
  competitorStatuses,
  CompetitorStatusBadge,
  competitorTypeLabel,
  competitorTypes,
  formatDateTime,
} from './competitor-view';
import { competitorStatusLabels, competitorTypeLabels } from '@/types/labels';

const pageSizes = [10, 20, 50] as const;
const sortFields = [
  ['registeredAt', 'Fecha de registro'],
  ['name', 'Nombre'],
  ['nickname', 'Apodo'],
  ['type', 'Tipo'],
  ['status', 'Estado'],
] as const;

interface NavigationNotice {
  message: string;
  title: string;
}

export function CompetitorListPage() {
  const { resources } = useApi();
  const { roles } = useAuth();
  const isAdministrator = roles.includes('ADMINISTRATOR');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = readQuery(searchParams);
  const [search, setSearch] = useState(query.search ?? '');
  const notice = location.state as NavigationNotice | null;

  useEffect(() => setSearch(query.search ?? ''), [query.search]);

  const competitorsQuery = useQuery({
    queryFn: ({ signal }) => resources.competitors.list(query, signal),
    queryKey: queryKeys.competitors.list(query),
  });

  function updateQuery(patch: QueryPatch) {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.status) params.set('status', next.status);
    if (next.type) params.set('type', next.type);
    if (next.sortBy && next.sortBy !== 'registeredAt')
      params.set('sortBy', next.sortBy);
    if (next.sortOrder && next.sortOrder !== 'desc')
      params.set('sortOrder', next.sortOrder);
    if (next.page && next.page !== 1) params.set('page', String(next.page));
    if (next.limit && next.limit !== 20)
      params.set('limit', String(next.limit));
    setSearchParams(params);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateQuery({ page: 1, search: search.trim() || undefined });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <Toast
          message={notice.message}
          onDismiss={() =>
            void navigate(`${location.pathname}${location.search}`, {
              replace: true,
              state: null,
            })
          }
          title={notice.title}
        />
      ) : null}

      <PageHeader
        actions={
          isAdministrator ? (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              to="/competitors/new"
            >
              <Plus aria-hidden="true" className="size-4" />
              Nuevo competidor
            </Link>
          ) : undefined
        }
        description="Consulta y administra los competidores de la liga."
        eyebrow="Registro deportivo"
        title="Competidores"
      />

      <form onSubmit={submitSearch}>
        <FilterBar
          actions={
            <>
              <Button size="sm" type="submit">
                <Search aria-hidden="true" className="size-4" />
                Buscar
              </Button>
              <Button
                onClick={() => {
                  setSearch('');
                  setSearchParams(new URLSearchParams());
                }}
                size="sm"
                variant="secondary"
              >
                Limpiar
              </Button>
            </>
          }
        >
          <FormField htmlFor="competitor-search" label="Buscar">
            <input
              className={fieldControlClassName}
              id="competitor-search"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, apodo u origen"
              value={search}
            />
          </FormField>
          <FormField htmlFor="competitor-type-filter" label="Tipo">
            <select
              className={fieldControlClassName}
              id="competitor-type-filter"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  type: (event.target.value || undefined) as
                    CompetitorType | undefined,
                })
              }
              value={query.type ?? ''}
            >
              <option value="">Todos</option>
              {competitorTypes.map((type) => (
                <option key={type} value={type}>
                  {competitorTypeLabels[type]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="competitor-status-filter" label="Estado">
            <select
              className={fieldControlClassName}
              id="competitor-status-filter"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  status: (event.target.value || undefined) as
                    CompetitorStatus | undefined,
                })
              }
              value={query.status ?? ''}
            >
              <option value="">Todos</option>
              {competitorStatuses.map((status) => (
                <option key={status} value={status}>
                  {competitorStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="competitor-sort" label="Ordenar por">
            <select
              className={fieldControlClassName}
              id="competitor-sort"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortBy: event.target.value as CompetitorQuery['sortBy'],
                })
              }
              value={query.sortBy}
            >
              {sortFields.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="competitor-sort-order" label="Dirección">
            <select
              className={fieldControlClassName}
              id="competitor-sort-order"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortOrder: event.target.value as CompetitorQuery['sortOrder'],
                })
              }
              value={query.sortOrder}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </FormField>
          <FormField htmlFor="competitor-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="competitor-limit"
              onChange={(event) =>
                updateQuery({ limit: Number(event.target.value), page: 1 })
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
            <SlidersHorizontal className="size-4" />
            {competitorsQuery.data?.totalItems ?? 0} registros
          </span>
        }
        description="Selecciona un registro para consultar todos sus datos."
        title="Registro oficial"
      >
        {competitorsQuery.isPending ? (
          <LoadingState />
        ) : competitorsQuery.isError ? (
          <ErrorState
            description="No fue posible consultar los competidores."
            onRetry={() => void competitorsQuery.refetch()}
            title="Error al cargar"
          />
        ) : competitorsQuery.data.items.length === 0 ? (
          <EmptyState
            description="No hay competidores que coincidan con los filtros actuales."
            title="Sin resultados"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Listado de competidores"
              columns={competitorColumns(isAdministrator)}
              getRowKey={(competitor) => competitor.id}
              rows={competitorsQuery.data.items}
            />
            <Pagination
              currentPage={competitorsQuery.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={competitorsQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function competitorColumns(isAdministrator: boolean) {
  return [
    {
      header: 'Competidor',
      key: 'competitor',
      render: (competitor: Competitor) => (
        <div>
          <Link
            className="font-semibold text-foreground hover:text-primary"
            to={`/competitors/${competitor.id}`}
          >
            {competitor.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {competitor.nickname}
          </p>
        </div>
      ),
    },
    {
      header: 'Tipo',
      key: 'type',
      render: (competitor: Competitor) => competitorTypeLabel(competitor.type),
    },
    {
      header: 'Origen',
      key: 'origin',
      render: (competitor: Competitor) => competitor.origin,
    },
    {
      header: 'Estado',
      key: 'status',
      render: (competitor: Competitor) => (
        <CompetitorStatusBadge status={competitor.status} />
      ),
    },
    {
      header: 'Registro',
      key: 'registeredAt',
      render: (competitor: Competitor) =>
        formatDateTime(competitor.registeredAt),
    },
    ...(isAdministrator
      ? [
          {
            align: 'right' as const,
            header: 'Acciones',
            key: 'actions',
            render: (competitor: Competitor) => (
              <Link
                className="text-xs font-semibold text-primary hover:underline"
                to={`/competitors/${competitor.id}/edit`}
              >
                Editar
              </Link>
            ),
          },
        ]
      : []),
  ];
}

type QueryPatch = {
  [Key in keyof CompetitorQuery]?: CompetitorQuery[Key] | undefined;
};

function readQuery(
  params: URLSearchParams,
): Required<Pick<CompetitorQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder'>> &
  CompetitorQuery {
  const page = safeInteger(params.get('page'), 1);
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const limit = pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
    ? limitCandidate
    : 20;
  const statusValue = params.get('status');
  const typeValue = params.get('type');
  const sortValue = params.get('sortBy');
  const orderValue = params.get('sortOrder');
  const search = params.get('search')?.trim().slice(0, 100);
  return {
    limit,
    page,
    ...(search ? { search } : {}),
    sortBy: sortFields.some(([value]) => value === sortValue)
      ? (sortValue as NonNullable<CompetitorQuery['sortBy']>)
      : 'registeredAt',
    sortOrder: orderValue === 'asc' ? 'asc' : 'desc',
    ...(competitorStatuses.includes(statusValue as CompetitorStatus)
      ? { status: statusValue as CompetitorStatus }
      : {}),
    ...(competitorTypes.includes(typeValue as CompetitorType)
      ? { type: typeValue as CompetitorType }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
