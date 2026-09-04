import { Medal, Search, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type {
  CompetitorStanding,
  CompetitorStatus,
  CompetitorType,
  StandingsQuery,
  TeamStanding,
  TeamStatus,
} from '@/api/domain.types';
import { useApi } from '@/api/use-api';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { queryKeys } from '@/query/query-keys';
import {
  competitorStatusLabels,
  competitorTypeLabels,
  resultStatusLabels,
  teamStatusLabels,
} from '@/types/labels';
import { formatDuration } from '@/pages/results/result-view';

const pageSizes = [10, 20, 50] as const;
const sortFields = [
  ['position', 'Posición oficial'],
  ['name', 'Nombre'],
  ['totalPoints', 'Puntos'],
  ['wins', 'Victorias'],
  ['secondPlaces', 'Segundos puestos'],
  ['racesCompleted', 'Carreras completadas'],
  ['bestFinalTimeMs', 'Mejor tiempo'],
] as const;
const competitorStatuses = ['ACTIVE', 'SUSPENDED', 'RETIRED'] as const;
const competitorTypes = ['DWARF', 'CAMEL', 'MEDIUM', 'OTHER'] as const;
const teamStatuses = ['ACTIVE', 'INACTIVE'] as const;
type StandingView = 'competitors' | 'teams';

export function StandingsPage() {
  const { resources } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readState(searchParams);
  const [search, setSearch] = useState(state.search ?? '');
  useEffect(() => setSearch(state.search ?? ''), [state.search]);

  const commonQuery = {
    limit: state.limit,
    page: state.page,
    ...(state.search ? { search: state.search } : {}),
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
  const competitorQuery = {
    ...commonQuery,
    ...(state.competitorStatus ? { status: state.competitorStatus } : {}),
    ...(state.competitorType ? { type: state.competitorType } : {}),
  };
  const teamQuery = {
    ...commonQuery,
    ...(state.teamStatus ? { status: state.teamStatus } : {}),
  };
  const metadataQuery = { limit: 1, page: 1 };
  const metadata = useQuery({
    queryFn: ({ signal }) => resources.standings.overall(metadataQuery, signal),
    queryKey: queryKeys.standings.overall(metadataQuery),
  });
  const competitors = useQuery({
    enabled: state.view === 'competitors',
    queryFn: ({ signal }) =>
      resources.standings.competitors(competitorQuery, signal),
    queryKey: queryKeys.standings.competitors(competitorQuery),
  });
  const teams = useQuery({
    enabled: state.view === 'teams',
    queryFn: ({ signal }) => resources.standings.teams(teamQuery, signal),
    queryKey: queryKeys.standings.teams(teamQuery),
  });
  const activeQuery = state.view === 'competitors' ? competitors : teams;

  function updateState(patch: Partial<typeof state>) {
    const next = { ...state, ...patch };
    const params = new URLSearchParams();
    if (next.view !== 'competitors') params.set('view', next.view);
    if (next.search) params.set('search', next.search);
    if (next.sortBy !== 'position') params.set('sortBy', next.sortBy);
    if (next.sortOrder !== 'asc') params.set('sortOrder', next.sortOrder);
    if (next.page !== 1) params.set('page', String(next.page));
    if (next.limit !== 20) params.set('limit', String(next.limit));
    if (next.view === 'competitors') {
      if (next.competitorStatus) params.set('status', next.competitorStatus);
      if (next.competitorType) params.set('type', next.competitorType);
    } else if (next.teamStatus) params.set('status', next.teamStatus);
    setSearchParams(params);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateState({ page: 1, search: search.trim() || undefined });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Consulta las posiciones, los puntos y las estadísticas de los resultados oficiales."
        eyebrow="Tabla oficial"
        title="Clasificación"
      />

      <Panel title="Reglas de puntuación">
        {metadata.isPending ? (
          <LoadingState />
        ) : metadata.isError ? (
          <ErrorState
            description="No fue posible consultar las reglas oficiales."
            onRetry={() => void metadata.refetch()}
            title="Error al cargar"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
            <div className="flex flex-wrap gap-2">
              {metadata.data.pointsTable.map((entry) => (
                <span
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  key={entry.position}
                >
                  <strong className="text-primary">#{entry.position}</strong> ·{' '}
                  {entry.points} pts
                </span>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estados con cero puntos
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {metadata.data.zeroPointResultStatuses.map((status) => (
                  <StatusBadge key={status} tone="neutral">
                    {resultStatusLabels[status]}
                  </StatusBadge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex gap-2" role="tablist">
        <Button
          aria-selected={state.view === 'competitors'}
          onClick={() =>
            updateState({
              competitorStatus: undefined,
              competitorType: undefined,
              page: 1,
              teamStatus: undefined,
              view: 'competitors',
            })
          }
          role="tab"
          variant={state.view === 'competitors' ? 'primary' : 'secondary'}
        >
          Competidores
        </Button>
        <Button
          aria-selected={state.view === 'teams'}
          onClick={() =>
            updateState({
              competitorStatus: undefined,
              competitorType: undefined,
              page: 1,
              teamStatus: undefined,
              view: 'teams',
            })
          }
          role="tab"
          variant={state.view === 'teams' ? 'primary' : 'secondary'}
        >
          Equipos
        </Button>
      </div>

      <form onSubmit={submitSearch}>
        <FilterBar
          actions={
            <Button size="sm" type="submit">
              <Search aria-hidden="true" className="size-4" />
              Buscar
            </Button>
          }
        >
          <FormField htmlFor="standing-search" label="Buscar">
            <input
              className={fieldControlClassName}
              id="standing-search"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre"
              value={search}
            />
          </FormField>
          {state.view === 'competitors' ? (
            <>
              <FormField htmlFor="standing-status" label="Estado">
                <select
                  className={fieldControlClassName}
                  id="standing-status"
                  onChange={(event) =>
                    updateState({
                      competitorStatus: (event.target.value || undefined) as
                        CompetitorStatus | undefined,
                      page: 1,
                    })
                  }
                  value={state.competitorStatus ?? ''}
                >
                  <option value="">Todos</option>
                  {competitorStatuses.map((status) => (
                    <option key={status} value={status}>
                      {competitorStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField htmlFor="standing-type" label="Tipo">
                <select
                  className={fieldControlClassName}
                  id="standing-type"
                  onChange={(event) =>
                    updateState({
                      competitorType: (event.target.value || undefined) as
                        CompetitorType | undefined,
                      page: 1,
                    })
                  }
                  value={state.competitorType ?? ''}
                >
                  <option value="">Todos</option>
                  {competitorTypes.map((type) => (
                    <option key={type} value={type}>
                      {competitorTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          ) : (
            <FormField htmlFor="standing-status" label="Estado">
              <select
                className={fieldControlClassName}
                id="standing-status"
                onChange={(event) =>
                  updateState({
                    page: 1,
                    teamStatus: (event.target.value || undefined) as
                      TeamStatus | undefined,
                  })
                }
                value={state.teamStatus ?? ''}
              >
                <option value="">Todos</option>
                {teamStatuses.map((status) => (
                  <option key={status} value={status}>
                    {teamStatusLabels[status]}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField htmlFor="standing-sort" label="Ordenar por">
            <select
              className={fieldControlClassName}
              id="standing-sort"
              onChange={(event) =>
                updateState({
                  page: 1,
                  sortBy: event.target.value as typeof state.sortBy,
                })
              }
              value={state.sortBy}
            >
              {sortFields.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="standing-order" label="Dirección">
            <select
              className={fieldControlClassName}
              id="standing-order"
              onChange={(event) =>
                updateState({
                  page: 1,
                  sortOrder: event.target.value as 'asc' | 'desc',
                })
              }
              value={state.sortOrder}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </FormField>
          <FormField htmlFor="standing-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="standing-limit"
              onChange={(event) =>
                updateState({ limit: Number(event.target.value), page: 1 })
              }
              value={state.limit}
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
            {activeQuery.data?.totalItems ?? 0} clasificados
          </span>
        }
        title={state.view === 'competitors' ? 'Competidores' : 'Equipos'}
      >
        {activeQuery.isPending ? (
          <LoadingState />
        ) : activeQuery.isError ? (
          <ErrorState
            description="No fue posible consultar la clasificación."
            onRetry={() => void activeQuery.refetch()}
            title="Error al cargar"
          />
        ) : activeQuery.data.items.length === 0 ? (
          <EmptyState
            description="No existen posiciones oficiales que coincidan con los filtros."
            title="Sin clasificados"
          />
        ) : (
          <div className="space-y-4">
            {state.view === 'competitors' ? (
              <ResponsiveTable
                caption="Clasificación oficial de competidores"
                columns={competitorColumns}
                getRowKey={(row) => row.competitorId}
                rows={competitors.data!.items}
              />
            ) : (
              <ResponsiveTable
                caption="Clasificación oficial de equipos"
                columns={teamColumns}
                getRowKey={(row) => row.teamId}
                rows={teams.data!.items}
              />
            )}
            <Pagination
              currentPage={activeQuery.data.page}
              onPageChange={(page) => updateState({ page })}
              totalPages={activeQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

const commonColumns = [
  {
    header: 'Posición',
    key: 'position',
    render: (row: CompetitorStanding | TeamStanding) => (
      <span className="inline-flex items-center gap-1 font-display text-lg font-bold text-primary">
        <Medal aria-hidden="true" className="size-4" />#{row.position}
      </span>
    ),
  },
  {
    header: 'Puntos',
    key: 'points',
    render: (row: CompetitorStanding | TeamStanding) => (
      <strong>{row.totalPoints}</strong>
    ),
  },
  {
    header: 'Victorias / 2.º',
    key: 'podiums',
    render: (row: CompetitorStanding | TeamStanding) =>
      `${row.wins} / ${row.secondPlaces}`,
  },
  {
    header: 'Completadas',
    key: 'completed',
    render: (row: CompetitorStanding | TeamStanding) => row.racesCompleted,
  },
  {
    header: 'Mejor tiempo',
    key: 'bestTime',
    render: (row: CompetitorStanding | TeamStanding) =>
      formatDuration(row.bestFinalTimeMs),
  },
];

const competitorColumns = [
  commonColumns[0]!,
  {
    header: 'Competidor',
    key: 'name',
    render: (row: CompetitorStanding) => (
      <div>
        <Link
          className="font-semibold hover:text-primary"
          to={`/competitors/${row.competitorId}`}
        >
          {row.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {row.nickname} · {competitorTypeLabels[row.type]} ·{' '}
          {competitorStatusLabels[row.status]}
        </p>
      </div>
    ),
  },
  ...commonColumns.slice(1),
];

const teamColumns = [
  commonColumns[0]!,
  {
    header: 'Equipo',
    key: 'name',
    render: (row: TeamStanding) => (
      <div>
        <Link
          className="font-semibold hover:text-primary"
          to={`/teams/${row.teamId}`}
        >
          {row.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {teamStatusLabels[row.status]}
        </p>
      </div>
    ),
  },
  ...commonColumns.slice(1),
];

function readState(params: URLSearchParams) {
  const view: StandingView =
    params.get('view') === 'teams' ? 'teams' : 'competitors';
  const sortCandidate = params.get('sortBy');
  const statusCandidate = params.get('status');
  const typeCandidate = params.get('type');
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const search = params.get('search')?.trim().slice(0, 100);
  return {
    view,
    search: search === '' ? undefined : search,
    sortBy: sortFields.some(([value]) => value === sortCandidate)
      ? (sortCandidate as NonNullable<StandingsQuery['sortBy']>)
      : ('position' as const),
    sortOrder:
      params.get('sortOrder') === 'desc' ? ('desc' as const) : ('asc' as const),
    page: safeInteger(params.get('page'), 1),
    limit: pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
      ? limitCandidate
      : 20,
    competitorStatus:
      view === 'competitors' &&
      competitorStatuses.includes(statusCandidate as CompetitorStatus)
        ? (statusCandidate as CompetitorStatus)
        : undefined,
    competitorType:
      view === 'competitors' &&
      competitorTypes.includes(typeCandidate as CompetitorType)
        ? (typeCandidate as CompetitorType)
        : undefined,
    teamStatus:
      view === 'teams' && teamStatuses.includes(statusCandidate as TeamStatus)
        ? (statusCandidate as TeamStatus)
        : undefined,
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
