import {
  ArrowLeft,
  Check,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import type {
  CreateRegistrationInput,
  Race,
  Registration,
  RegistrationQuery,
  RegistrationStatus,
} from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
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
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { registrationStatusLabels } from '@/types/labels';
import { formatDateTime, raceTypeLabel } from '@/pages/races/race-view';
import {
  registrationErrorMessage,
  registrationStatuses,
  RegistrationStatusBadge,
} from './registration-view';

const pageSizes = [10, 20, 50] as const;
type ParticipantKind = 'competitor' | 'team';
type Decision =
  | { kind: 'approve'; registration: Registration }
  | { kind: 'reject'; registration: Registration }
  | null;

type QueryPatch = {
  [Key in keyof RegistrationQuery]?: RegistrationQuery[Key] | undefined;
};

export function RaceRegistrationsPage() {
  const { raceId = '' } = useParams();
  const { resources } = useApi();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readQuery(searchParams);
  const [participantKind, setParticipantKind] =
    useState<ParticipantKind>('competitor');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [decision, setDecision] = useState<Decision>(null);
  const [startingPosition, setStartingPosition] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const raceQuery = useQuery({
    enabled: Boolean(raceId),
    queryFn: ({ signal }) => resources.races.detail(raceId, signal),
    queryKey: queryKeys.races.detail(raceId),
  });
  const registrationsQuery = useQuery({
    enabled: Boolean(raceId),
    queryFn: ({ signal }) =>
      resources.registrations.list(raceId, query, signal),
    queryKey: queryKeys.registrations.list(raceId, query),
  });

  const race = raceQuery.data;
  const effectiveKind = compatibleKind(race, participantKind);
  useEffect(() => {
    if (!race || race.type === 'MIXED') return;
    setParticipantKind(race.type === 'TEAM' ? 'team' : 'competitor');
  }, [race]);

  const competitorCandidates = useQuery({
    enabled: Boolean(race) && effectiveKind === 'competitor',
    queryFn: ({ signal }) =>
      resources.competitors.list(
        {
          limit: 100,
          page: 1,
          ...(submittedSearch ? { search: submittedSearch } : {}),
          sortBy: 'name',
          sortOrder: 'asc',
          status: 'ACTIVE',
        },
        signal,
      ),
    queryKey: queryKeys.competitors.list({
      limit: 100,
      page: 1,
      ...(submittedSearch ? { search: submittedSearch } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
      status: 'ACTIVE',
    }),
  });
  const teamCandidates = useQuery({
    enabled: Boolean(race) && effectiveKind === 'team',
    queryFn: ({ signal }) =>
      resources.teams.list(
        {
          limit: 100,
          page: 1,
          ...(submittedSearch ? { search: submittedSearch } : {}),
          sortBy: 'name',
          sortOrder: 'asc',
          status: 'ACTIVE',
        },
        signal,
      ),
    queryKey: queryKeys.teams.list({
      limit: 100,
      page: 1,
      ...(submittedSearch ? { search: submittedSearch } : {}),
      sortBy: 'name',
      sortOrder: 'asc',
      status: 'ACTIVE',
    }),
  });

  const candidates = useMemo(
    () =>
      effectiveKind === 'competitor'
        ? (competitorCandidates.data?.items ?? [])
        : (teamCandidates.data?.items ?? []),
    [
      competitorCandidates.data?.items,
      effectiveKind,
      teamCandidates.data?.items,
    ],
  );
  const candidatesPending =
    effectiveKind === 'competitor'
      ? competitorCandidates.isPending
      : teamCandidates.isPending;
  const candidatesError =
    effectiveKind === 'competitor'
      ? competitorCandidates.isError
      : teamCandidates.isError;

  async function invalidateRegistrationData() {
    await invalidateResources(queryClient, mutationInvalidation.registration);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateRegistrationInput) =>
      resources.registrations.create(raceId, input),
    onError: (error: Error) => setErrorMessage(registrationErrorMessage(error)),
    onSuccess: async () => {
      setParticipantId('');
      setSuccessMessage('La solicitud de inscripción quedó pendiente.');
      await invalidateRegistrationData();
    },
  });
  const approveMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      resources.registrations.approve(id, position),
    onError: (error: Error) => setErrorMessage(registrationErrorMessage(error)),
    onSuccess: async () => {
      setDecision(null);
      setStartingPosition('');
      setSuccessMessage('La inscripción fue aprobada.');
      await invalidateRegistrationData();
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      resources.registrations.reject(id, reason),
    onError: (error: Error) => setErrorMessage(registrationErrorMessage(error)),
    onSuccess: async () => {
      setDecision(null);
      setRejectionReason('');
      setSuccessMessage('La inscripción fue rechazada.');
      await invalidateRegistrationData();
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => resources.registrations.cancel(id),
    onError: (error: Error) => setErrorMessage(registrationErrorMessage(error)),
    onSuccess: async () => {
      setCancelTarget(null);
      setSuccessMessage('La inscripción fue cancelada.');
      await invalidateRegistrationData();
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

  function submitCandidateSearch(event: FormEvent) {
    event.preventDefault();
    setParticipantId('');
    setSubmittedSearch(candidateSearch.trim().slice(0, 100));
  }

  function submitRegistration(event: FormEvent) {
    event.preventDefault();
    if (!participantId) return;
    setErrorMessage(null);
    createMutation.mutate(
      effectiveKind === 'competitor'
        ? { competitorId: participantId }
        : { teamId: participantId },
    );
  }

  function chooseDecision(next: Decision) {
    setDecision(next);
    setStartingPosition('');
    setRejectionReason('');
    setErrorMessage(null);
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
  if (!race) return <LoadingState />;

  const registrationOpen =
    race.status === 'OPEN_FOR_REGISTRATION' &&
    new Date(race.registrationDeadline).getTime() > Date.now();
  const mutationPending =
    createMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <Toast
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
          title="No se pudo completar la operación"
          tone="danger"
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
        description={`${raceTypeLabel(race.type)} · cierre ${formatDateTime(race.registrationDeadline)} · capacidad ${race.maxParticipants}`}
        eyebrow="Gestión por carrera"
        title={`Inscripciones · ${race.name}`}
      />

      <Panel
        description="La elegibilidad, los duplicados, la composición del equipo, el plazo y la capacidad se validan definitivamente en el backend."
        title="Nueva inscripción"
      >
        {!registrationOpen ? (
          <DisabledState
            description="Solo se admiten solicitudes mientras la carrera está abierta y antes de su fecha límite."
            title="Ventana de inscripciones cerrada"
          />
        ) : (
          <div className="space-y-5">
            {race.type === 'MIXED' ? (
              <FormField
                htmlFor="participant-kind"
                label="Tipo de participante"
              >
                <select
                  className={fieldControlClassName}
                  disabled={mutationPending}
                  id="participant-kind"
                  onChange={(event) => {
                    setParticipantKind(event.target.value as ParticipantKind);
                    setParticipantId('');
                    setCandidateSearch('');
                    setSubmittedSearch('');
                  }}
                  value={effectiveKind}
                >
                  <option value="competitor">Competidor</option>
                  <option value="team">Equipo</option>
                </select>
              </FormField>
            ) : (
              <p className="rounded-md border border-border bg-background/45 p-3 text-sm text-muted-foreground">
                Esta carrera admite únicamente{' '}
                {effectiveKind === 'competitor' ? 'competidores' : 'equipos'}.
              </p>
            )}

            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={submitCandidateSearch}
            >
              <div className="flex-1">
                <FormField
                  htmlFor="candidate-search"
                  label={`Buscar ${effectiveKind === 'competitor' ? 'competidor' : 'equipo'} activo`}
                >
                  <input
                    className={fieldControlClassName}
                    id="candidate-search"
                    maxLength={100}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                    placeholder="Nombre"
                    value={candidateSearch}
                  />
                </FormField>
              </div>
              <Button type="submit" variant="secondary">
                <Search aria-hidden="true" className="size-4" />
                Buscar
              </Button>
            </form>

            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
              onSubmit={submitRegistration}
            >
              <FormField htmlFor="participant-id" label="Participante">
                <select
                  className={fieldControlClassName}
                  disabled={
                    candidatesPending || candidatesError || mutationPending
                  }
                  id="participant-id"
                  onChange={(event) => setParticipantId(event.target.value)}
                  required
                  value={participantId}
                >
                  <option value="">
                    {candidatesPending
                      ? 'Cargando participantes…'
                      : candidatesError
                        ? 'No fue posible cargar participantes'
                        : candidates.length === 0
                          ? 'No hay participantes activos disponibles'
                          : 'Seleccionar participante'}
                  </option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button
                disabled={!participantId || mutationPending}
                type="submit"
              >
                Inscribir participante
              </Button>
            </form>
          </div>
        )}
      </Panel>

      <FilterBar>
        <FormField htmlFor="registration-status-filter" label="Estado">
          <select
            className={fieldControlClassName}
            id="registration-status-filter"
            onChange={(event) =>
              updateQuery({
                page: 1,
                status: (event.target.value || undefined) as
                  RegistrationStatus | undefined,
              })
            }
            value={query.status ?? ''}
          >
            <option value="">Todos</option>
            {registrationStatuses.map((status) => (
              <option key={status} value={status}>
                {registrationStatusLabels[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField htmlFor="registration-limit" label="Por página">
          <select
            className={fieldControlClassName}
            id="registration-limit"
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

      {decision ? (
        <DecisionPanel
          decision={decision}
          disabled={mutationPending}
          onApprove={() => {
            const position = Number(startingPosition);
            if (!Number.isInteger(position) || position < 1) return;
            approveMutation.mutate({
              id: decision.registration.id,
              position,
            });
          }}
          onCancel={() => chooseDecision(null)}
          onReject={() => {
            const reason = rejectionReason.trim();
            if (!reason) return;
            rejectMutation.mutate({ id: decision.registration.id, reason });
          }}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          setStartingPosition={setStartingPosition}
          startingPosition={startingPosition}
        />
      ) : null}

      <Panel
        action={
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {registrationsQuery.data?.totalItems ?? 0} registros
          </span>
        }
        description="La API de inscripciones devuelve identificadores del participante; cada uno enlaza con su ficha correspondiente."
        title="Solicitudes registradas"
      >
        {registrationsQuery.isPending ? (
          <LoadingState />
        ) : registrationsQuery.isError ? (
          <ErrorState
            description="No fue posible consultar las inscripciones."
            onRetry={() => void registrationsQuery.refetch()}
            title="Error al cargar"
          />
        ) : registrationsQuery.data.items.length === 0 ? (
          <EmptyState
            description="No hay inscripciones que coincidan con el estado seleccionado."
            title="Sin inscripciones"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Inscripciones de la carrera"
              columns={registrationColumns({
                disabled: mutationPending,
                registrationOpen,
                onCancel: setCancelTarget,
                onDecision: chooseDecision,
              })}
              getRowKey={(registration) => registration.id}
              rows={registrationsQuery.data.items}
            />
            <Pagination
              currentPage={registrationsQuery.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={registrationsQuery.data.totalPages}
            />
          </div>
        )}
      </Panel>

      <ConfirmDialog
        busy={cancelMutation.isPending}
        confirmLabel="Cancelar inscripción"
        description="La inscripción dejará de participar en esta carrera. Esta operación se valida nuevamente contra el estado y el plazo de la carrera."
        isOpen={cancelTarget !== null}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        title="¿Cancelar esta inscripción?"
      />
    </div>
  );
}

function DecisionPanel({
  decision,
  disabled,
  onApprove,
  onCancel,
  onReject,
  rejectionReason,
  setRejectionReason,
  setStartingPosition,
  startingPosition,
}: {
  decision: NonNullable<Decision>;
  disabled: boolean;
  onApprove: () => void;
  onCancel: () => void;
  onReject: () => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  setStartingPosition: (value: string) => void;
  startingPosition: string;
}) {
  const approving = decision.kind === 'approve';
  const positionValid =
    Number.isInteger(Number(startingPosition)) && Number(startingPosition) > 0;
  const reasonValid = rejectionReason.trim().length > 0;
  return (
    <Panel
      description={`Inscripción ${decision.registration.id}`}
      title={approving ? 'Aprobar inscripción' : 'Rechazar inscripción'}
    >
      <div className="space-y-4">
        {approving ? (
          <FormField
            hint="Debe ser un entero positivo y no puede repetirse en la carrera."
            htmlFor="starting-position"
            label="Posición de salida"
            required
          >
            <input
              className={fieldControlClassName}
              disabled={disabled}
              id="starting-position"
              inputMode="numeric"
              min={1}
              onChange={(event) => setStartingPosition(event.target.value)}
              step={1}
              type="number"
              value={startingPosition}
            />
          </FormField>
        ) : (
          <FormField
            hint={`${rejectionReason.length}/1000 caracteres`}
            htmlFor="rejection-reason"
            label="Motivo"
            required
          >
            <textarea
              className={`${fieldControlClassName} min-h-24 resize-y`}
              disabled={disabled}
              id="rejection-reason"
              maxLength={1000}
              onChange={(event) => setRejectionReason(event.target.value)}
              value={rejectionReason}
            />
          </FormField>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled || (approving ? !positionValid : !reasonValid)}
            onClick={approving ? onApprove : onReject}
          >
            {approving ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <X aria-hidden="true" className="size-4" />
            )}
            {approving ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </Button>
          <Button disabled={disabled} onClick={onCancel} variant="secondary">
            Volver
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function registrationColumns({
  disabled,
  registrationOpen,
  onCancel,
  onDecision,
}: {
  disabled: boolean;
  registrationOpen: boolean;
  onCancel: (registration: Registration) => void;
  onDecision: (decision: Decision) => void;
}) {
  return [
    {
      header: 'Participante',
      key: 'participant',
      render: (registration: Registration) => {
        const isCompetitor = Boolean(registration.competitorId);
        const participantId = registration.competitorId ?? registration.teamId;
        return participantId ? (
          <div>
            <Link
              className="font-semibold text-foreground hover:text-primary"
              to={`/${isCompetitor ? 'competitors' : 'teams'}/${participantId}`}
            >
              {isCompetitor ? 'Competidor' : 'Equipo'}
            </Link>
            <p className="mt-0.5 max-w-52 break-all font-mono text-[11px] text-muted-foreground">
              {participantId}
            </p>
          </div>
        ) : (
          'Sin identificador'
        );
      },
    },
    {
      header: 'Estado',
      key: 'status',
      render: (registration: Registration) => (
        <div>
          <RegistrationStatusBadge status={registration.status} />
          {registration.validationNotes ? (
            <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
              {registration.validationNotes}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Salida',
      key: 'startingPosition',
      render: (registration: Registration) =>
        registration.startingPosition ?? '—',
    },
    {
      header: 'Registro',
      key: 'registeredAt',
      render: (registration: Registration) =>
        formatDateTime(registration.registeredAt),
    },
    {
      align: 'right' as const,
      header: 'Acciones',
      key: 'actions',
      render: (registration: Registration) => (
        <div className="flex flex-wrap justify-end gap-2">
          {registration.status === 'PENDING' ? (
            <>
              <Button
                disabled={disabled}
                onClick={() => onDecision({ kind: 'approve', registration })}
                size="sm"
              >
                Aprobar
              </Button>
              <Button
                disabled={disabled}
                onClick={() => onDecision({ kind: 'reject', registration })}
                size="sm"
                variant="secondary"
              >
                Rechazar
              </Button>
            </>
          ) : null}
          {registrationOpen &&
          (registration.status === 'PENDING' ||
            registration.status === 'APPROVED') ? (
            <Button
              aria-label={`Cancelar inscripción ${registration.id}`}
              disabled={disabled}
              onClick={() => onCancel(registration)}
              size="icon"
              variant="danger"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
}

function compatibleKind(
  race: Race | undefined,
  selected: ParticipantKind,
): ParticipantKind {
  if (race?.type === 'INDIVIDUAL') return 'competitor';
  if (race?.type === 'TEAM') return 'team';
  return selected;
}

function readQuery(
  params: URLSearchParams,
): Required<Pick<RegistrationQuery, 'page' | 'limit'>> & RegistrationQuery {
  const page = safeInteger(params.get('page'), 1);
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const limit = pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
    ? limitCandidate
    : 20;
  const statusValue = params.get('status');
  return {
    limit,
    page,
    ...(registrationStatuses.includes(statusValue as RegistrationStatus)
      ? { status: statusValue as RegistrationStatus }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
