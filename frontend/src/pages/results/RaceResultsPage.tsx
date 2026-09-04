import { ArrowLeft, Pencil, SlidersHorizontal } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import type {
  CreateResultInput,
  RaceResult,
  ResultQuery,
  ResultStatus,
} from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import {
  DisabledState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { Toast } from '@/components/feedback/Toast';
import { FilterBar } from '@/components/forms/FilterBar';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { resultStatusLabels } from '@/types/labels';
import { formatDateTime } from '@/pages/races/race-view';
import { ResultForm } from './ResultForm';
import {
  formatDuration,
  resultErrorMessage,
  resultStatuses,
  ResultStatusBadge,
} from './result-view';

const pageSizes = [10, 20, 50] as const;
type QueryPatch = {
  [Key in keyof ResultQuery]?: ResultQuery[Key] | undefined;
};
interface NavigationNotice {
  message: string;
  title: string;
}

export function RaceResultsPage() {
  const { raceId = '' } = useParams();
  const { resources } = useApi();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = readQuery(searchParams);
  const canManage =
    roles.includes('ADMINISTRATOR') || roles.includes('RACE_ORGANIZER');
  const notice = location.state as NavigationNotice | null;
  const [formKey, setFormKey] = useState(0);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const raceQuery = useQuery({
    enabled: Boolean(raceId),
    queryFn: ({ signal }) => resources.races.detail(raceId, signal),
    queryKey: queryKeys.races.detail(raceId),
  });
  const resultsQuery = useQuery({
    enabled: Boolean(raceId),
    queryFn: ({ signal }) => resources.results.list(raceId, query, signal),
    queryKey: queryKeys.results.list(raceId, query),
  });
  const mayCreate = canManage && raceQuery.data?.status === 'IN_PROGRESS';
  const registrationsQuery = useQuery({
    enabled: mayCreate,
    queryFn: ({ signal }) =>
      resources.registrations.list(
        raceId,
        { limit: 100, page: registrationPage, status: 'APPROVED' },
        signal,
      ),
    queryKey: queryKeys.registrations.list(raceId, {
      limit: 100,
      page: registrationPage,
      status: 'APPROVED',
    }),
  });
  const existingResultsQuery = useQuery({
    enabled: mayCreate,
    queryFn: ({ signal }) =>
      resources.results.list(raceId, { limit: 100, page: 1 }, signal),
    queryKey: queryKeys.results.list(raceId, { limit: 100, page: 1 }),
  });
  const existingRegistrationIds = new Set(
    existingResultsQuery.data?.items.map((result) => result.registrationId),
  );
  const availableRegistrations =
    registrationsQuery.data?.items.filter(
      (registration) =>
        registration.startingPosition !== null &&
        !existingRegistrationIds.has(registration.id),
    ) ?? [];

  const createMutation = useMutation({
    mutationFn: (input: CreateResultInput) =>
      resources.results.create(raceId, input),
    onError: (error: Error) => setSubmissionError(resultErrorMessage(error)),
    onSuccess: async () => {
      setSubmissionError(null);
      setFormKey((current) => current + 1);
      setSuccessMessage('El resultado fue registrado correctamente.');
      await invalidateResources(queryClient, mutationInvalidation.result);
    },
  });

  function updateQuery(patch: QueryPatch) {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.page && next.page !== 1) params.set('page', String(next.page));
    if (next.limit && next.limit !== 20)
      params.set('limit', String(next.limit));
    setSearchParams(params);
  }

  if (raceQuery.isPending) return <LoadingState />;
  if (raceQuery.isError)
    return (
      <ErrorState
        description="No fue posible consultar la carrera asociada."
        onRetry={() => void raceQuery.refetch()}
        title="Error al cargar"
      />
    );
  const race = raceQuery.data;
  if (!race) return <LoadingState />;

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
      {successMessage ? (
        <Toast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          title="Operación completada"
        />
      ) : null}

      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to={`/races/${race.id}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver a la carrera
          </Link>
        }
        description="Tiempos expresados como MM:SS.mmm. El tiempo final incluye las penalizaciones aplicables."
        eyebrow="Resultados de carrera"
        title={race.name}
      />

      {canManage ? (
        <Panel
          description="Solo una inscripción aprobada con posición de salida puede recibir un resultado."
          title="Registrar resultado"
        >
          {race.status !== 'IN_PROGRESS' ? (
            <DisabledState
              description="Los resultados nuevos solo pueden registrarse mientras la carrera está en curso. Los existentes sí pueden corregirse después de completarla."
              title="Registro no disponible"
            />
          ) : registrationsQuery.isPending || existingResultsQuery.isPending ? (
            <LoadingState />
          ) : registrationsQuery.isError || existingResultsQuery.isError ? (
            <ErrorState
              description="No fue posible consultar las inscripciones aprobadas disponibles."
              onRetry={() => {
                void registrationsQuery.refetch();
                void existingResultsQuery.refetch();
              }}
              title="Error al cargar participantes"
            />
          ) : (
            <div className="space-y-5">
              {availableRegistrations.length === 0 ? (
                <EmptyState
                  description="Esta página no contiene participantes aprobados con posición de salida y sin resultado. Puedes revisar otra página."
                  title="Sin participantes disponibles"
                />
              ) : (
                <ResultForm
                  disabled={createMutation.isPending}
                  key={`${formKey}-${registrationPage}`}
                  onSubmit={(input) => {
                    setSubmissionError(null);
                    createMutation.mutate(input as CreateResultInput);
                  }}
                  registrations={availableRegistrations}
                  submissionError={submissionError}
                />
              )}
              {(registrationsQuery.data?.totalPages ?? 0) > 1 ? (
                <Pagination
                  currentPage={registrationPage}
                  onPageChange={(page) => {
                    setRegistrationPage(page);
                    setSubmissionError(null);
                  }}
                  totalPages={registrationsQuery.data?.totalPages ?? 0}
                />
              ) : null}
            </div>
          )}
        </Panel>
      ) : null}

      <FilterBar>
        <FormField htmlFor="result-status-filter" label="Estado">
          <select
            className={fieldControlClassName}
            id="result-status-filter"
            onChange={(event) =>
              updateQuery({
                page: 1,
                status: (event.target.value || undefined) as
                  ResultStatus | undefined,
              })
            }
            value={query.status ?? ''}
          >
            <option value="">Todos</option>
            {resultStatuses.map((status) => (
              <option key={status} value={status}>
                {resultStatusLabels[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField htmlFor="result-limit" label="Por página">
          <select
            className={fieldControlClassName}
            id="result-limit"
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

      <Panel
        action={
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {resultsQuery.data?.totalItems ?? 0} registros
          </span>
        }
        description="Resultados oficiales registrados para esta carrera."
        title="Resultados registrados"
      >
        {resultsQuery.isPending ? (
          <LoadingState />
        ) : resultsQuery.isError ? (
          <ErrorState
            description="No fue posible consultar los resultados."
            onRetry={() => void resultsQuery.refetch()}
            title="Error al cargar"
          />
        ) : resultsQuery.data.items.length === 0 ? (
          <EmptyState
            description="No hay resultados que coincidan con el estado seleccionado."
            title="Sin resultados"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Resultados de la carrera"
              columns={resultColumns(canManage)}
              getRowKey={(result) => result.id}
              rows={resultsQuery.data.items}
            />
            <Pagination
              currentPage={resultsQuery.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={resultsQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function resultColumns(canManage: boolean) {
  return [
    {
      header: 'Inscripción',
      key: 'registration',
      render: (result: RaceResult) => (
        <div>
          <span className="font-semibold">{result.participantName}</span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Salida {result.startingPosition}
          </p>
        </div>
      ),
    },
    {
      header: 'Estado',
      key: 'status',
      render: (result: RaceResult) => (
        <div>
          <ResultStatusBadge status={result.status} />
          {result.notes ? (
            <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
              {result.notes}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Posición',
      key: 'position',
      render: (result: RaceResult) => result.finalPosition ?? '—',
    },
    {
      header: 'Bruto',
      key: 'rawTime',
      render: (result: RaceResult) => formatDuration(result.rawTimeMs),
    },
    {
      header: 'Penalización',
      key: 'penalty',
      render: (result: RaceResult) => formatDuration(result.penaltyTimeMs),
    },
    {
      header: 'Final oficial',
      key: 'finalTime',
      render: (result: RaceResult) => (
        <span className="font-mono font-semibold text-primary">
          {formatDuration(result.finalTimeMs)}
        </span>
      ),
    },
    {
      header: 'Registro',
      key: 'recordedAt',
      render: (result: RaceResult) => formatDateTime(result.recordedAt),
    },
    ...(canManage
      ? [
          {
            align: 'right' as const,
            header: 'Acciones',
            key: 'actions',
            render: (result: RaceResult) => (
              <Link
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/75"
                to={`/results/${result.id}/edit`}
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                Corregir
              </Link>
            ),
          },
        ]
      : []),
  ];
}

function readQuery(
  params: URLSearchParams,
): Required<Pick<ResultQuery, 'page' | 'limit'>> & ResultQuery {
  const page = safeInteger(params.get('page'), 1);
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const limit = pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
    ? limitCandidate
    : 20;
  const statusValue = params.get('status');
  return {
    limit,
    page,
    ...(resultStatuses.includes(statusValue as ResultStatus)
      ? { status: statusValue as ResultStatus }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
