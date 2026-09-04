import {
  ArrowLeft,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '@/api/api-errors';
import type { Competitor, TeamMember, TeamStatus } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { Toast } from '@/components/feedback/Toast';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import {
  competitorStatusLabels,
  competitorTypeLabels,
  teamStatusLabels,
} from '@/types/labels';
import { formatDateTime, TeamStatusBadge } from './team-view';

type PendingAction =
  | { kind: 'delete' }
  | { kind: 'remove-member'; competitor: Competitor }
  | { kind: 'status'; status: TeamStatus }
  | null;

export function TeamDetailPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdministrator = roles.includes('ADMINISTRATOR');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');

  const teamQuery = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.teams.detail(id, signal),
    queryKey: queryKeys.teams.detail(id),
  });

  const candidateQueryInput = {
    limit: 100,
    page: 1,
    ...(submittedSearch ? { search: submittedSearch } : {}),
    sortBy: 'name' as const,
    sortOrder: 'asc' as const,
  };
  const candidatesQuery = useQuery({
    enabled: isAdministrator && teamQuery.data?.status === 'ACTIVE',
    queryFn: ({ signal }) =>
      resources.competitors.list(candidateQueryInput, signal),
    queryKey: queryKeys.competitors.list(candidateQueryInput),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TeamStatus) =>
      resources.teams.updateStatus(id, status),
    onError: (error: Error) => setErrorMessage(teamConflictMessage(error)),
    onSuccess: async (team) => {
      queryClient.setQueryData(queryKeys.teams.detail(id), team);
      await invalidateResources(queryClient, mutationInvalidation.team);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => resources.teams.remove(id),
    onError: (error: Error) => setErrorMessage(error.message),
    onSuccess: async () => {
      await invalidateResources(queryClient, mutationInvalidation.team);
      void navigate('/teams', {
        replace: true,
        state: {
          message:
            'El equipo fue eliminado o desactivado según su historial.',
          title: 'Operación completada',
        },
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (competitorId: string) =>
      resources.teams.addMember(id, competitorId),
    onError: (error: Error) => setErrorMessage(teamConflictMessage(error)),
    onSuccess: async () => {
      setSelectedCompetitorId('');
      await invalidateResources(queryClient, mutationInvalidation.team);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (competitorId: string) =>
      resources.teams.removeMember(id, competitorId),
    onError: (error: Error) => setErrorMessage(teamConflictMessage(error)),
    onSuccess: async () => {
      await invalidateResources(queryClient, mutationInvalidation.team);
    },
  });

  if (teamQuery.isPending) return <LoadingState />;
  if (teamQuery.isError)
    return (
      <ErrorState
        description={teamQuery.error.message}
        onRetry={() => void teamQuery.refetch()}
        title="No fue posible cargar el equipo"
      />
    );

  const team = teamQuery.data;
  const activeMembers = team.members.filter((member) => member.leftAt === null);
  const historicalMembers = team.members.filter(
    (member) => member.leftAt !== null,
  );
  const activeMemberIds = new Set(
    activeMembers.map((member) => member.competitor.id),
  );
  const candidates =
    candidatesQuery.data?.items.filter(
      (competitor) => !activeMemberIds.has(competitor.id),
    ) ?? [];
  const targetStatus: TeamStatus =
    team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const isMutating =
    statusMutation.isPending ||
    deleteMutation.isPending ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending;

  function submitCandidateSearch(event: FormEvent) {
    event.preventDefault();
    setSelectedCompetitorId('');
    setSubmittedSearch(candidateSearch.trim());
  }

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

      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
              to="/teams"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver
            </Link>
            {isAdministrator ? (
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                to={`/teams/${team.id}/edit`}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Editar
              </Link>
            ) : null}
          </>
        }
        description={`Responsable: ${team.responsiblePerson}`}
        eyebrow="Ficha de equipo"
        title={team.name}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          action={<TeamStatusBadge status={team.status} />}
          title="Datos registrados"
        >
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <Datum label="Nombre" value={team.name} />
            <Datum label="Persona responsable" value={team.responsiblePerson} />
            <Datum
              label="Descripción"
              value={
                team.description?.trim() ? team.description : 'Sin descripción'
              }
            />
            <Datum label="Creado" value={formatDateTime(team.createdAt)} />
            <Datum
              label="Última actualización"
              value={formatDateTime(team.updatedAt)}
            />
            <Datum
              label="Integrantes activos"
              value={String(activeMembers.length)}
            />
          </dl>
        </Panel>

        {isAdministrator ? (
          <Panel
            description="El cambio debe respetar el estado actual del equipo."
            title="Administración"
          >
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted-foreground">
                  Estado de destino
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {teamStatusLabels[targetStatus]}
                </p>
                <Button
                  className="mt-3"
                  disabled={isMutating}
                  onClick={() =>
                    setPendingAction({ kind: 'status', status: targetStatus })
                  }
                  size="sm"
                  variant="secondary"
                >
                  Cambiar estado
                </Button>
              </div>
              <div className="border-t border-border pt-5">
                <Button
                  disabled={isMutating}
                  onClick={() => setPendingAction({ kind: 'delete' })}
                  variant="danger"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Eliminar o desactivar
                </Button>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Sin historial de membresías se elimina; con historial se
                  conserva como inactivo.
                </p>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Acceso de consulta">
            <p className="text-sm leading-6 text-muted-foreground">
              Tu rol permite consultar el equipo y su historial. Las
              modificaciones están reservadas al administrador.
            </p>
          </Panel>
        )}
      </div>

      {isAdministrator ? (
        <Panel
          description="Solo se pueden agregar competidores elegibles mientras haya cupo disponible."
          title="Agregar integrante"
        >
          {team.status === 'INACTIVE' ? (
            <EmptyState
              description="Activa el equipo antes de intentar agregar integrantes."
              title="Equipo inactivo"
            />
          ) : (
            <div className="space-y-4">
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={submitCandidateSearch}
              >
                <div className="flex-1">
                  <FormField
                    htmlFor="team-member-search"
                    label="Buscar competidor"
                  >
                    <input
                      className={fieldControlClassName}
                      id="team-member-search"
                      maxLength={100}
                      onChange={(event) =>
                        setCandidateSearch(event.target.value)
                      }
                      placeholder="Nombre, apodo u origen"
                      value={candidateSearch}
                    />
                  </FormField>
                </div>
                <Button size="sm" type="submit" variant="secondary">
                  <Search aria-hidden="true" className="size-4" />
                  Buscar
                </Button>
              </form>

              {candidatesQuery.isPending ? (
                <LoadingState />
              ) : candidatesQuery.isError ? (
                <ErrorState
                  description="No fue posible consultar los competidores."
                  onRetry={() => void candidatesQuery.refetch()}
                  title="Error al buscar"
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <FormField
                      hint="El competidor no debe pertenecer a otro equipo activo."
                      htmlFor="team-member-candidate"
                      label="Competidor"
                    >
                      <select
                        className={fieldControlClassName}
                        id="team-member-candidate"
                        onChange={(event) =>
                          setSelectedCompetitorId(event.target.value)
                        }
                        value={selectedCompetitorId}
                      >
                        <option value="">Seleccionar competidor</option>
                        {candidates.map((competitor) => (
                          <option key={competitor.id} value={competitor.id}>
                            {competitor.name} · {competitor.nickname} ·{' '}
                            {competitorStatusLabels[competitor.status]}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <Button
                    disabled={!selectedCompetitorId || isMutating}
                    onClick={() => {
                      setErrorMessage(null);
                      addMemberMutation.mutate(selectedCompetitorId);
                    }}
                  >
                    <UserPlus aria-hidden="true" className="size-4" />
                    Agregar
                  </Button>
                </div>
              )}
              {candidatesQuery.data && candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay candidatos disponibles en los resultados actuales.
                </p>
              ) : null}
            </div>
          )}
        </Panel>
      ) : null}

      <Panel
        action={
          <span className="font-mono text-xs text-muted-foreground">
            {activeMembers.length} activos
          </span>
        }
        description="Una membresía activa no tiene fecha de salida."
        title="Integrantes actuales"
      >
        {activeMembers.length === 0 ? (
          <EmptyState
            description="Este equipo no tiene integrantes activos."
            title="Sin integrantes actuales"
          />
        ) : (
          <ResponsiveTable
            caption="Integrantes actuales del equipo"
            columns={activeMemberColumns(isAdministrator, (competitor) =>
              setPendingAction({ kind: 'remove-member', competitor }),
            )}
            getRowKey={(member) => member.id}
            rows={activeMembers}
          />
        )}
      </Panel>

      <Panel
        action={
          <span className="font-mono text-xs text-muted-foreground">
            {historicalMembers.length} históricos
          </span>
        }
        description="Las filas conservan la fecha de ingreso y la fecha en que terminó la membresía."
        title="Historial de membresías"
      >
        {historicalMembers.length === 0 ? (
          <EmptyState
            description="Todavía no existen membresías finalizadas."
            title="Sin historial"
          />
        ) : (
          <ResponsiveTable
            caption="Historial de membresías del equipo"
            columns={historicalMemberColumns}
            getRowKey={(member) => member.id}
            rows={historicalMembers}
          />
        )}
      </Panel>

      <ConfirmDialog
        busy={isMutating}
        confirmLabel={confirmationLabel(pendingAction)}
        description={confirmationDescription(pendingAction, team.name)}
        isOpen={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          setErrorMessage(null);
          if (action?.kind === 'delete') deleteMutation.mutate();
          if (action?.kind === 'status') statusMutation.mutate(action.status);
          if (action?.kind === 'remove-member')
            removeMemberMutation.mutate(action.competitor.id);
        }}
        title={confirmationTitle(pendingAction)}
      />
    </div>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function memberIdentity(member: TeamMember) {
  return (
    <div>
      <Link
        className="font-semibold hover:text-primary"
        to={`/competitors/${member.competitor.id}`}
      >
        {member.competitor.name}
      </Link>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {member.competitor.nickname} ·{' '}
        {competitorTypeLabels[member.competitor.type]}
      </p>
    </div>
  );
}

function activeMemberColumns(
  isAdministrator: boolean,
  onRemove: (competitor: Competitor) => void,
) {
  return [
    { header: 'Competidor', key: 'competitor', render: memberIdentity },
    {
      header: 'Estado',
      key: 'status',
      render: (member: TeamMember) =>
        competitorStatusLabels[member.competitor.status],
    },
    {
      header: 'Ingreso',
      key: 'joinedAt',
      render: (member: TeamMember) => formatDateTime(member.joinedAt),
    },
    ...(isAdministrator
      ? [
          {
            align: 'right' as const,
            header: 'Acciones',
            key: 'actions',
            render: (member: TeamMember) => (
              <Button
                onClick={() => onRemove(member.competitor)}
                size="sm"
                variant="secondary"
              >
                <UserMinus aria-hidden="true" className="size-4" />
                Finalizar
              </Button>
            ),
          },
        ]
      : []),
  ];
}

const historicalMemberColumns = [
  { header: 'Competidor', key: 'competitor', render: memberIdentity },
  {
    header: 'Ingreso',
    key: 'joinedAt',
    render: (member: TeamMember) => formatDateTime(member.joinedAt),
  },
  {
    header: 'Salida',
    key: 'leftAt',
    render: (member: TeamMember) =>
      member.leftAt ? formatDateTime(member.leftAt) : '—',
  },
];

function confirmationLabel(action: PendingAction): string {
  if (action?.kind === 'delete') return 'Confirmar operación';
  if (action?.kind === 'remove-member') return 'Finalizar membresía';
  return 'Cambiar estado';
}

function confirmationTitle(action: PendingAction): string {
  if (action?.kind === 'delete') return '¿Eliminar o desactivar equipo?';
  if (action?.kind === 'remove-member') return '¿Finalizar membresía?';
  return '¿Confirmar cambio de estado?';
}

function confirmationDescription(action: PendingAction, teamName: string) {
  if (action?.kind === 'status')
    return `El estado de ${teamName} cambiará a ${teamStatusLabels[action.status]}.`;
  if (action?.kind === 'delete')
    return `${teamName} se eliminará si no tiene historial; de lo contrario se desactivará.`;
  if (action?.kind === 'remove-member')
    return `Se registrará la fecha de salida de ${action.competitor.name}; la membresía permanecerá en el historial.`;
  return '';
}

function teamConflictMessage(error: Error): string {
  if (!(error instanceof ApiError) || error.status !== 409)
    return error.message;
  const message = error.message.toLowerCase();
  if (message.includes('maximum'))
    return 'El equipo alcanzó el máximo de integrantes activos.';
  if (message.includes('inactive team'))
    return 'Un equipo inactivo no puede recibir integrantes. Actívalo e intenta nuevamente.';
  if (
    message.includes('another active team') ||
    message.includes('belongs to an active team')
  )
    return 'El competidor ya pertenece a otro equipo activo.';
  if (message.includes('already an active member'))
    return 'El competidor ya es integrante activo de este equipo.';
  if (message.includes('status cannot transition'))
    return 'El estado del equipo cambió. Actualiza la ficha e intenta nuevamente.';
  return error.message;
}
