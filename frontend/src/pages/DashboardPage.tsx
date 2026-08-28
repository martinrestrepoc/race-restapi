import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  Flag,
  Medal,
  Plus,
  Radio,
  Trophy,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ApiError, ApiNetworkError } from '@/api/api-errors';
import type { Race, RaceResult } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { queryKeys } from '@/query/query-keys';
import {
  raceStatusLabels,
  raceTypeLabels,
  resultStatusLabels,
} from '@/types/labels';

const inProgressQuery = { limit: 1, page: 1, status: 'IN_PROGRESS' as const };
const upcomingQuery = {
  limit: 100,
  page: 1,
  sortBy: 'scheduledAt' as const,
  sortOrder: 'asc' as const,
};
const activeCompetitorsQuery = { limit: 1, page: 1, status: 'ACTIVE' as const };
const completedRaceQuery = {
  limit: 1,
  page: 1,
  sortBy: 'scheduledAt' as const,
  sortOrder: 'desc' as const,
  status: 'COMPLETED' as const,
};
const standingsQuery = { limit: 5, page: 1 };
const firstPage = { limit: 5, page: 1 };

export function DashboardPage() {
  const { resources } = useApi();
  const { roles } = useAuth();
  const canManageRaces =
    roles.includes('ADMINISTRATOR') || roles.includes('RACE_ORGANIZER');
  const canManageCompetitors = roles.includes('ADMINISTRATOR');

  const activeRace = useQuery({
    queryFn: ({ signal }) => resources.races.list(inProgressQuery, signal),
    queryKey: queryKeys.races.list(inProgressQuery),
  });
  const upcomingRaces = useQuery({
    queryFn: ({ signal }) => resources.races.list(upcomingQuery, signal),
    queryKey: queryKeys.races.list(upcomingQuery),
  });
  const activeCompetitors = useQuery({
    queryFn: ({ signal }) =>
      resources.competitors.list(activeCompetitorsQuery, signal),
    queryKey: queryKeys.competitors.list(activeCompetitorsQuery),
  });
  const standings = useQuery({
    queryFn: ({ signal }) =>
      resources.standings.overall(standingsQuery, signal),
    queryKey: queryKeys.standings.overall(standingsQuery),
  });
  const completedRace = useQuery({
    queryFn: ({ signal }) => resources.races.list(completedRaceQuery, signal),
    queryKey: queryKeys.races.list(completedRaceQuery),
  });

  const now = Date.now();
  const futureRaces =
    upcomingRaces.data?.items.filter(
      (race) =>
        new Date(race.scheduledAt).getTime() >= now &&
        race.status !== 'CANCELLED' &&
        race.status !== 'COMPLETED',
    ) ?? [];
  const liveRace = activeRace.data?.items[0];
  const featuredRace = liveRace ?? futureRaces[0];
  const latestCompletedRace = completedRace.data?.items[0];

  const liveResults = useQuery({
    enabled: liveRace !== undefined,
    queryFn: ({ signal }) =>
      resources.results.list(liveRace!.id, firstPage, signal),
    queryKey: queryKeys.results.list(liveRace?.id ?? 'inactive', firstPage),
    refetchInterval: 30_000,
  });
  const recentResults = useQuery({
    enabled: latestCompletedRace !== undefined,
    queryFn: ({ signal }) =>
      resources.results.list(latestCompletedRace!.id, firstPage, signal),
    queryKey: queryKeys.results.list(
      latestCompletedRace?.id ?? 'inactive',
      firstPage,
    ),
  });
  const registrations = useQuery({
    enabled: canManageRaces && featuredRace !== undefined,
    queryFn: ({ signal }) =>
      resources.registrations.list(
        featuredRace!.id,
        { limit: 1, page: 1 },
        signal,
      ),
    queryKey: queryKeys.registrations.list(featuredRace?.id ?? 'inactive', {
      limit: 1,
      page: 1,
    }),
  });

  return (
    <>
      <PageHeader
        actions={
          <>
            {canManageCompetitors ? (
              <ActionLink to="/competitors/new" variant="secondary">
                <Users aria-hidden="true" className="size-4" />
                Nuevo competidor
              </ActionLink>
            ) : null}
            {canManageRaces ? (
              <ActionLink to="/races/new">
                <Plus aria-hidden="true" className="size-4" />
                Nueva carrera
              </ActionLink>
            ) : null}
          </>
        }
        description="Estado operativo de la liga obtenido directamente del servicio REST. Cada bloque se actualiza y recupera de forma independiente."
        eyebrow="Operación de la liga"
        title="Panel general"
      />

      <FeaturedRace
        isError={activeRace.isError || upcomingRaces.isError}
        isLoading={activeRace.isPending || upcomingRaces.isPending}
        live={liveRace !== undefined}
        onRetry={() => {
          void activeRace.refetch();
          void upcomingRaces.refetch();
        }}
        onResultsRetry={() => void liveResults.refetch()}
        race={featuredRace}
        results={liveRace ? liveResults.data?.items : undefined}
        resultsError={liveRace !== undefined && liveResults.isError}
        resultsLoading={liveRace !== undefined && liveResults.isPending}
        resultsUpdatedAt={liveRace ? liveResults.dataUpdatedAt : undefined}
      />

      <section
        aria-label="Métricas de la liga"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          icon={UserRoundCheck}
          label="Competidores activos"
          loading={activeCompetitors.isPending}
          onRetry={() => void activeCompetitors.refetch()}
          value={activeCompetitors.data?.totalItems}
          error={activeCompetitors.isError}
        />
        <MetricCard
          icon={CalendarClock}
          label="Carreras próximas"
          loading={upcomingRaces.isPending}
          onRetry={() => void upcomingRaces.refetch()}
          value={upcomingRaces.data ? futureRaces.length : undefined}
          error={upcomingRaces.isError}
        />
        <MetricCard
          icon={Trophy}
          label="Líder individual"
          loading={standings.isPending}
          onRetry={() => void standings.refetch()}
          value={standings.data?.competitors.items[0]?.name}
          error={standings.isError}
        />
        {canManageRaces ? (
          <MetricCard
            icon={Flag}
            label={featuredRace ? 'Inscripciones destacadas' : 'Inscripciones'}
            loading={registrations.isPending && featuredRace !== undefined}
            onRetry={() => void registrations.refetch()}
            value={featuredRace ? registrations.data?.totalItems : undefined}
            error={registrations.isError}
          />
        ) : (
          <MetricCard
            icon={Medal}
            label="Resultados de la última carrera"
            loading={
              recentResults.isPending && latestCompletedRace !== undefined
            }
            onRetry={() => void recentResults.refetch()}
            value={
              latestCompletedRace ? recentResults.data?.totalItems : undefined
            }
            error={recentResults.isError}
          />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <UpcomingRacesPanel
          error={upcomingRaces.error}
          loading={upcomingRaces.isPending}
          onRetry={() => void upcomingRaces.refetch()}
          races={futureRaces.slice(0, 5)}
        />
        <StandingsPanel
          error={standings.error}
          loading={standings.isPending}
          onRetry={() => void standings.refetch()}
          rows={standings.data?.competitors.items ?? []}
        />
      </section>

      <ResultsPanel
        error={completedRace.error ?? recentResults.error}
        loading={
          completedRace.isPending ||
          (latestCompletedRace !== undefined && recentResults.isPending)
        }
        onRetry={() => {
          void completedRace.refetch();
          void recentResults.refetch();
        }}
        race={latestCompletedRace}
        results={recentResults.data?.items ?? []}
      />
    </>
  );
}

function FeaturedRace({
  isError,
  isLoading,
  live,
  onRetry,
  onResultsRetry,
  race,
  results,
  resultsError,
  resultsLoading,
  resultsUpdatedAt,
}: {
  isError: boolean;
  isLoading: boolean;
  live: boolean;
  onRetry: () => void;
  onResultsRetry: () => void;
  race: Race | undefined;
  results: RaceResult[] | undefined;
  resultsError: boolean;
  resultsLoading: boolean;
  resultsUpdatedAt: number | undefined;
}) {
  if (isLoading) return <LoadingCard label="Cargando carrera destacada" />;
  if (isError) {
    return (
      <ErrorState
        description="No fue posible determinar la carrera activa o la siguiente carrera programada."
        onRetry={onRetry}
        title="Carrera destacada no disponible"
      />
    );
  }
  if (!race) {
    return (
      <EmptyState
        description="No existe una carrera en curso ni una carrera futura disponible."
        title="Sin carrera destacada"
      />
    );
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-5 ring-1 ring-primary/10 sm:p-7">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,var(--primary),transparent_65%)] opacity-[0.08]" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={live ? 'danger' : raceStatusTone(race.status)}>
              {live ? 'En vivo' : raceStatusLabels[race.status]}
            </StatusBadge>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {raceTypeLabels[race.type]}
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-tight sm:text-5xl">
            {race.name}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {race.description ??
              'Esta carrera no tiene una descripción registrada.'}
          </p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <RaceFact label="Fecha" value={formatDateTime(race.scheduledAt)} />
            <RaceFact
              label="Recorrido"
              value={`${race.startLocation} → ${race.finishLocation}`}
            />
            <RaceFact
              label="Distancia"
              value={formatDistance(race.distanceMeters)}
            />
          </dl>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          {live ? (
            resultsError ? (
              <button
                className="text-xs font-semibold text-destructive underline"
                onClick={onResultsRetry}
                type="button"
              >
                No fue posible actualizar resultados. Reintentar
              </button>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Radio aria-hidden="true" className="size-4 text-destructive" />
                {resultsLoading
                  ? 'Actualizando resultados…'
                  : resultsUpdatedAt
                    ? `Resultados actualizados ${formatTime(resultsUpdatedAt)}`
                    : 'Esperando resultados oficiales'}
              </p>
            )
          ) : null}
          <ActionLink to={`/races/${race.id}`} variant="secondary">
            Ver carrera
          </ActionLink>
          {live && results ? (
            <span className="text-xs text-muted-foreground">
              {results.length} resultados visibles en esta actualización
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  error,
  icon: Icon,
  label,
  loading,
  onRetry,
  value,
}: {
  error: boolean;
  icon: typeof Trophy;
  label: string;
  loading: boolean;
  onRetry: () => void;
  value: number | string | undefined;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <Icon aria-hidden="true" className="size-5 text-primary" />
      {loading ? (
        <p className="mt-3 animate-pulse font-display text-2xl text-muted-foreground">
          —
        </p>
      ) : error ? (
        <button
          className="mt-3 text-left text-xs font-semibold text-destructive underline"
          onClick={onRetry}
          type="button"
        >
          Reintentar
        </button>
      ) : (
        <p
          className="mt-3 truncate font-display text-2xl font-bold"
          title={String(value ?? '')}
        >
          {value ?? 'Sin datos'}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </article>
  );
}

function UpcomingRacesPanel({
  error,
  loading,
  onRetry,
  races,
}: {
  error: Error | null;
  loading: boolean;
  onRetry: () => void;
  races: Race[];
}) {
  return (
    <Panel
      action={<ActionLink to="/races">Ver todas</ActionLink>}
      description="Carreras futuras no canceladas ni completadas."
      title="Próximas carreras"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          description={errorMessage(error)}
          onRetry={onRetry}
          title="No fue posible cargar las carreras"
        />
      ) : races.length === 0 ? (
        <EmptyState
          description="No hay carreras futuras registradas."
          title="Sin próximas carreras"
        />
      ) : (
        <ul className="divide-y divide-border">
          {races.map((race) => (
            <li
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              key={race.id}
            >
              <div className="min-w-0">
                <Link
                  className="font-medium hover:text-primary"
                  to={`/races/${race.id}`}
                >
                  {race.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(race.scheduledAt)} ·{' '}
                  {raceTypeLabels[race.type]}
                </p>
              </div>
              <StatusBadge tone={raceStatusTone(race.status)}>
                {raceStatusLabels[race.status]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function StandingsPanel({
  error,
  loading,
  onRetry,
  rows,
}: {
  error: Error | null;
  loading: boolean;
  onRetry: () => void;
  rows: {
    competitorId: string;
    name: string;
    nickname: string;
    position: number;
    totalPoints: number;
  }[];
}) {
  return (
    <Panel
      action={<ActionLink to="/standings">Tabla completa</ActionLink>}
      description="Clasificación individual oficial por puntos."
      title="Líderes de la liga"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          description={errorMessage(error)}
          onRetry={onRetry}
          title="No fue posible cargar la clasificación"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          description="Todavía no existen resultados oficiales puntuables."
          title="Clasificación vacía"
        />
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li
              className="flex items-center gap-3 rounded-lg border border-border bg-background/45 p-3"
              key={row.competitorId}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary font-mono text-sm font-bold">
                {row.position}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{row.name}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.nickname}
                </span>
              </span>
              <strong className="font-mono text-sm text-primary">
                {row.totalPoints} pts
              </strong>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function ResultsPanel({
  error,
  loading,
  onRetry,
  race,
  results,
}: {
  error: Error | null;
  loading: boolean;
  onRetry: () => void;
  race: Race | undefined;
  results: RaceResult[];
}) {
  const columns = [
    {
      header: 'Posición',
      key: 'position',
      render: (row: RaceResult) => row.finalPosition ?? '—',
    },
    {
      header: 'Salida',
      key: 'startingPosition',
      render: (row: RaceResult) => row.startingPosition,
    },
    {
      header: 'Estado',
      key: 'status',
      render: (row: RaceResult) => (
        <StatusBadge tone={row.status === 'FINISHED' ? 'success' : 'warning'}>
          {resultStatusLabels[row.status]}
        </StatusBadge>
      ),
    },
    {
      align: 'right' as const,
      header: 'Tiempo oficial',
      key: 'time',
      render: (row: RaceResult) =>
        row.finalTimeMs === null ? '—' : formatDuration(row.finalTimeMs),
    },
  ];

  return (
    <Panel
      description={
        race
          ? `Resultados oficiales de “${race.name}”.`
          : 'Resultados de la carrera completada más reciente.'
      }
      title="Resultados recientes"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          description={errorMessage(error)}
          onRetry={onRetry}
          title="No fue posible cargar los resultados"
        />
      ) : !race ? (
        <EmptyState
          description="No hay una carrera completada para mostrar."
          title="Sin resultados recientes"
        />
      ) : results.length === 0 ? (
        <EmptyState
          description="La carrera más reciente no tiene resultados registrados."
          title="Carrera sin resultados"
        />
      ) : (
        <ResponsiveTable
          caption={`Resultados oficiales de ${race.name}`}
          columns={columns}
          getRowKey={(row) => row.id}
          rows={results}
        />
      )}
    </Panel>
  );
}

function RaceFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      className="rounded-xl border border-border bg-card p-6"
    >
      <LoadingState />
    </section>
  );
}

function ActionLink({
  children,
  to,
  variant = 'primary',
}: {
  children: React.ReactNode;
  to: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Link
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/75'}`}
      to={to}
    >
      {children}
    </Link>
  );
}

function raceStatusTone(status: Race['status']): StatusBadgeTone {
  if (status === 'IN_PROGRESS') return 'danger';
  if (status === 'COMPLETED') return 'success';
  if (status === 'OPEN_FOR_REGISTRATION') return 'primary';
  if (status === 'CANCELLED') return 'danger';
  return 'neutral';
}

function errorMessage(error: Error): string {
  if (error instanceof ApiNetworkError) return error.message;
  if (error instanceof ApiError && error.status === 403)
    return 'No tienes permisos para consultar esta información.';
  return 'El servicio no pudo entregar esta información. Intenta nuevamente.';
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat('es-CO', { timeStyle: 'medium' }).format(
    new Date(value),
  );
}

function formatDistance(value: number): string {
  return value >= 1000
    ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value / 1000)} km`
    : `${value} m`;
}

function formatDuration(value: number): string {
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const milliseconds = value % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}
