import { CalendarDays, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import type { Race, RaceQuery, RaceStatus, RaceType } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
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
import { raceStatusLabels, raceTypeLabels } from '@/types/labels';
import {
  formatDateTime,
  raceStatuses,
  RaceStatusBadge,
  raceTypeLabel,
  raceTypes,
} from './race-view';

const pageSizes = [10, 20, 50] as const;
const sortFields = [
  ['scheduledAt', 'Fecha programada'],
  ['registrationDeadline', 'Cierre de inscripciones'],
  ['name', 'Nombre'],
  ['status', 'Estado'],
  ['createdAt', 'Fecha de creación'],
] as const;

interface NavigationNotice {
  message: string;
  title: string;
}
type QueryPatch = { [Key in keyof RaceQuery]?: RaceQuery[Key] | undefined };

export function RaceListPage() {
  const { resources } = useApi();
  const { roles } = useAuth();
  const canManage =
    roles.includes('ADMINISTRATOR') || roles.includes('RACE_ORGANIZER');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = readQuery(searchParams);
  const [search, setSearch] = useState(query.search ?? '');
  const notice = location.state as NavigationNotice | null;

  useEffect(() => setSearch(query.search ?? ''), [query.search]);
  const racesQuery = useQuery({
    queryFn: ({ signal }) => resources.races.list(query, signal),
    queryKey: queryKeys.races.list(query),
  });

  function updateQuery(patch: QueryPatch) {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.status) params.set('status', next.status);
    if (next.type) params.set('type', next.type);
    if (next.sortBy && next.sortBy !== 'scheduledAt')
      params.set('sortBy', next.sortBy);
    if (next.sortOrder && next.sortOrder !== 'asc')
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
          canManage ? (
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              to="/races/new"
            >
              <Plus className="size-4" />
              Nueva carrera
            </Link>
          ) : undefined
        }
        description="Consulta el calendario con filtros y orden provistos por la API."
        eyebrow="Calendario deportivo"
        title="Carreras"
      />
      <form onSubmit={submitSearch}>
        <FilterBar
          actions={
            <>
              <Button size="sm" type="submit">
                <Search className="size-4" />
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
          <FormField htmlFor="race-search" label="Buscar">
            <input
              className={fieldControlClassName}
              id="race-search"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, descripción o ubicación"
              value={search}
            />
          </FormField>
          <FormField htmlFor="race-type-filter" label="Tipo">
            <select
              className={fieldControlClassName}
              id="race-type-filter"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  type: (event.target.value || undefined) as
                    RaceType | undefined,
                })
              }
              value={query.type ?? ''}
            >
              <option value="">Todos</option>
              {raceTypes.map((type) => (
                <option key={type} value={type}>
                  {raceTypeLabels[type]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="race-status-filter" label="Estado">
            <select
              className={fieldControlClassName}
              id="race-status-filter"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  status: (event.target.value || undefined) as
                    RaceStatus | undefined,
                })
              }
              value={query.status ?? ''}
            >
              <option value="">Todos</option>
              {raceStatuses.map((status) => (
                <option key={status} value={status}>
                  {raceStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="race-sort" label="Ordenar por">
            <select
              className={fieldControlClassName}
              id="race-sort"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortBy: event.target.value as RaceQuery['sortBy'],
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
          <FormField htmlFor="race-sort-order" label="Dirección">
            <select
              className={fieldControlClassName}
              id="race-sort-order"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortOrder: event.target.value as RaceQuery['sortOrder'],
                })
              }
              value={query.sortOrder}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </FormField>
          <FormField htmlFor="race-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="race-limit"
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
            <CalendarDays className="size-4" />
            {racesQuery.data?.totalItems ?? 0} carreras
          </span>
        }
        description="Selecciona una carrera para consultar sus condiciones y estado."
        title="Calendario oficial"
      >
        {racesQuery.isPending ? (
          <LoadingState />
        ) : racesQuery.isError ? (
          <ErrorState
            description="No fue posible consultar las carreras."
            onRetry={() => void racesQuery.refetch()}
            title="Error al cargar"
          />
        ) : racesQuery.data.items.length === 0 ? (
          <EmptyState
            description="No hay carreras que coincidan con los filtros actuales."
            title="Sin resultados"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Listado de carreras"
              columns={raceColumns(canManage)}
              getRowKey={(race) => race.id}
              rows={racesQuery.data.items}
            />
            <Pagination
              currentPage={racesQuery.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={racesQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function raceColumns(canManage: boolean) {
  return [
    {
      header: 'Carrera',
      key: 'race',
      render: (race: Race) => (
        <div>
          <Link
            className="font-semibold hover:text-primary"
            to={`/races/${race.id}`}
          >
            {race.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {raceTypeLabel(race.type)}
          </p>
        </div>
      ),
    },
    {
      header: 'Programada',
      key: 'scheduledAt',
      render: (race: Race) => formatDateTime(race.scheduledAt),
    },
    {
      header: 'Recorrido',
      key: 'route',
      render: (race: Race) => `${race.startLocation} → ${race.finishLocation}`,
    },
    {
      header: 'Estado',
      key: 'status',
      render: (race: Race) => <RaceStatusBadge status={race.status} />,
    },
    ...(canManage
      ? [
          {
            align: 'right' as const,
            header: 'Acciones',
            key: 'actions',
            render: (race: Race) =>
              race.status === 'DRAFT' ? (
                <Link
                  className="text-xs font-semibold text-primary hover:underline"
                  to={`/races/${race.id}/edit`}
                >
                  Editar
                </Link>
              ) : (
                <Link
                  className="text-xs font-semibold text-muted-foreground hover:text-primary"
                  to={`/races/${race.id}`}
                >
                  Gestionar
                </Link>
              ),
          },
        ]
      : []),
  ];
}

function readQuery(
  params: URLSearchParams,
): Required<Pick<RaceQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder'>> &
  RaceQuery {
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
      ? (sortValue as NonNullable<RaceQuery['sortBy']>)
      : 'scheduledAt',
    sortOrder: orderValue === 'desc' ? 'desc' : 'asc',
    ...(raceStatuses.includes(statusValue as RaceStatus)
      ? { status: statusValue as RaceStatus }
      : {}),
    ...(raceTypes.includes(typeValue as RaceType)
      ? { type: typeValue as RaceType }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
