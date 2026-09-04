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

import type { Team, TeamQuery, TeamStatus } from '@/api/domain.types';
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
import { teamStatusLabels } from '@/types/labels';
import { formatDateTime, teamStatuses, TeamStatusBadge } from './team-view';

const pageSizes = [10, 20, 50] as const;
const sortFields = [
  ['createdAt', 'Fecha de creación'],
  ['name', 'Nombre'],
  ['responsiblePerson', 'Responsable'],
  ['status', 'Estado'],
] as const;

interface NavigationNotice {
  message: string;
  title: string;
}

type QueryPatch = {
  [Key in keyof TeamQuery]?: TeamQuery[Key] | undefined;
};

export function TeamListPage() {
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

  const teamsQuery = useQuery({
    queryFn: ({ signal }) => resources.teams.list(query, signal),
    queryKey: queryKeys.teams.list(query),
  });

  function updateQuery(patch: QueryPatch) {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.status) params.set('status', next.status);
    if (next.sortBy && next.sortBy !== 'createdAt')
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
              to="/teams/new"
            >
              <Plus aria-hidden="true" className="size-4" />
              Nuevo equipo
            </Link>
          ) : undefined
        }
        description="Consulta y administra los equipos de la liga."
        eyebrow="Organización deportiva"
        title="Equipos"
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
          <FormField htmlFor="team-search" label="Buscar">
            <input
              className={fieldControlClassName}
              id="team-search"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, descripción o responsable"
              value={search}
            />
          </FormField>
          <FormField htmlFor="team-status-filter" label="Estado">
            <select
              className={fieldControlClassName}
              id="team-status-filter"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  status: (event.target.value || undefined) as
                    TeamStatus | undefined,
                })
              }
              value={query.status ?? ''}
            >
              <option value="">Todos</option>
              {teamStatuses.map((status) => (
                <option key={status} value={status}>
                  {teamStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="team-sort" label="Ordenar por">
            <select
              className={fieldControlClassName}
              id="team-sort"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortBy: event.target.value as TeamQuery['sortBy'],
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
          <FormField htmlFor="team-sort-order" label="Dirección">
            <select
              className={fieldControlClassName}
              id="team-sort-order"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortOrder: event.target.value as TeamQuery['sortOrder'],
                })
              }
              value={query.sortOrder}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </FormField>
          <FormField htmlFor="team-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="team-limit"
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
            {teamsQuery.data?.totalItems ?? 0} registros
          </span>
        }
        description="Selecciona un equipo para consultar su ficha y sus membresías."
        title="Registro de equipos"
      >
        {teamsQuery.isPending ? (
          <LoadingState />
        ) : teamsQuery.isError ? (
          <ErrorState
            description="No fue posible consultar los equipos."
            onRetry={() => void teamsQuery.refetch()}
            title="Error al cargar"
          />
        ) : teamsQuery.data.items.length === 0 ? (
          <EmptyState
            description="No hay equipos que coincidan con los filtros actuales."
            title="Sin resultados"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Listado de equipos"
              columns={teamColumns(isAdministrator)}
              getRowKey={(team) => team.id}
              rows={teamsQuery.data.items}
            />
            <Pagination
              currentPage={teamsQuery.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={teamsQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function teamColumns(isAdministrator: boolean) {
  return [
    {
      header: 'Equipo',
      key: 'team',
      render: (team: Team) => (
        <div>
          <Link
            className="font-semibold text-foreground hover:text-primary"
            to={`/teams/${team.id}`}
          >
            {team.name}
          </Link>
          <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
            {team.description?.trim() ? team.description : 'Sin descripción'}
          </p>
        </div>
      ),
    },
    {
      header: 'Responsable',
      key: 'responsiblePerson',
      render: (team: Team) => team.responsiblePerson,
    },
    {
      header: 'Estado',
      key: 'status',
      render: (team: Team) => <TeamStatusBadge status={team.status} />,
    },
    {
      header: 'Creación',
      key: 'createdAt',
      render: (team: Team) => formatDateTime(team.createdAt),
    },
    ...(isAdministrator
      ? [
          {
            align: 'right' as const,
            header: 'Acciones',
            key: 'actions',
            render: (team: Team) => (
              <Link
                className="text-xs font-semibold text-primary hover:underline"
                to={`/teams/${team.id}/edit`}
              >
                Editar
              </Link>
            ),
          },
        ]
      : []),
  ];
}

function readQuery(
  params: URLSearchParams,
): Required<Pick<TeamQuery, 'page' | 'limit' | 'sortBy' | 'sortOrder'>> &
  TeamQuery {
  const page = safeInteger(params.get('page'), 1);
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const limit = pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
    ? limitCandidate
    : 20;
  const statusValue = params.get('status');
  const sortValue = params.get('sortBy');
  const orderValue = params.get('sortOrder');
  const search = params.get('search')?.trim().slice(0, 100);
  return {
    limit,
    page,
    ...(search ? { search } : {}),
    sortBy: sortFields.some(([value]) => value === sortValue)
      ? (sortValue as NonNullable<TeamQuery['sortBy']>)
      : 'createdAt',
    sortOrder: orderValue === 'asc' ? 'asc' : 'desc',
    ...(teamStatuses.includes(statusValue as TeamStatus)
      ? { status: statusValue as TeamStatus }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
