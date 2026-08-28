import { ArrowLeft, ClipboardList, Pencil, Trash2, Trophy } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '@/api/api-errors';
import type { RaceStatus } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/feedback/FeedbackState';
import { Toast } from '@/components/feedback/Toast';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { raceStatusLabels } from '@/types/labels';
import {
  browserTimeZoneLabel,
  formatDateTime,
  raceStatusTransitions,
  RaceStatusBadge,
  raceTypeLabel,
} from './race-view';

type PendingAction =
  | { kind: 'remove' }
  | { kind: 'status'; reason?: string; status: RaceStatus }
  | null;

export function RaceDetailPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canManage =
    roles.includes('ADMINISTRATOR') || roles.includes('RACE_ORGANIZER');
  const [selectedStatus, setSelectedStatus] = useState<RaceStatus | ''>('');
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const raceQuery = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.races.detail(id, signal),
    queryKey: queryKeys.races.detail(id),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      status,
      reason: transitionReason,
    }: {
      status: RaceStatus;
      reason?: string;
    }) => resources.races.updateStatus(id, status, transitionReason),
    onError: (error: Error) => setErrorMessage(raceConflictMessage(error)),
    onSuccess: async (race) => {
      queryClient.setQueryData(queryKeys.races.detail(id), race);
      setSelectedStatus('');
      setReason('');
      await invalidateResources(queryClient, mutationInvalidation.race);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => resources.races.remove(id),
    onError: (error: Error) => setErrorMessage(raceConflictMessage(error)),
    onSuccess: async () => {
      await invalidateResources(queryClient, mutationInvalidation.race);
      void navigate('/races', {
        replace: true,
        state: {
          message:
            'El backend eliminó el borrador o canceló la carrera para conservar su historial, según correspondía.',
          title: 'Operación completada',
        },
      });
    },
  });

  if (raceQuery.isPending) return <LoadingState />;
  if (raceQuery.isError)
    return (
      <ErrorState
        description={raceQuery.error.message}
        onRetry={() => void raceQuery.refetch()}
        title="No fue posible cargar la carrera"
      />
    );

  const race = raceQuery.data;
  const transitions = raceStatusTransitions[race.status];
  const isTerminal = transitions.length === 0;
  const isMutating = statusMutation.isPending || removeMutation.isPending;
  const timeZone = browserTimeZoneLabel();

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
              to="/races"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Link>
            {canManage && race.status === 'DRAFT' ? (
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                to={`/races/${race.id}/edit`}
              >
                <Pencil className="size-4" />
                Editar
              </Link>
            ) : null}
          </>
        }
        description={`${race.startLocation} → ${race.finishLocation}`}
        eyebrow="Ficha de carrera"
        title={race.name}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          action={<RaceStatusBadge status={race.status} />}
          description={`Fechas mostradas en ${timeZone}.`}
          title="Condiciones registradas"
        >
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <Datum label="Tipo" value={raceTypeLabel(race.type)} />
            <Datum
              label="Inicio programado"
              value={formatDateTime(race.scheduledAt)}
            />
            <Datum
              label="Cierre de inscripciones"
              value={formatDateTime(race.registrationDeadline)}
            />
            <Datum label="Lugar de salida" value={race.startLocation} />
            <Datum label="Lugar de llegada" value={race.finishLocation} />
            <Datum label="Distancia" value={`${race.distanceMeters} m`} />
            <Datum
              label="Capacidad máxima"
              value={String(race.maxParticipants)}
            />
            <Datum
              label="Descripción"
              value={
                race.description?.trim() ? race.description : 'Sin descripción'
              }
            />
            <Datum label="Creada" value={formatDateTime(race.createdAt)} />
            <Datum label="Actualizada" value={formatDateTime(race.updatedAt)} />
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel title="Módulos relacionados">
            <div className="space-y-2">
              {canManage ? (
                <Link
                  className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:border-primary/50 hover:text-primary"
                  to={`/races/${race.id}/registrations`}
                >
                  <ClipboardList className="size-4" />
                  Inscripciones
                </Link>
              ) : null}
              <Link
                className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold hover:border-primary/50 hover:text-primary"
                to={`/races/${race.id}/results`}
              >
                <Trophy className="size-4" />
                Resultados
              </Link>
            </div>
          </Panel>
          {canManage ? (
            <Panel
              description="Las reglas de participantes y resultados se validan en el backend."
              title="Ciclo de vida"
            >
              {isTerminal ? (
                <p className="rounded-md border border-border bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
                  {raceStatusLabels[race.status]} es un estado terminal. No hay
                  transiciones ni eliminación disponibles.
                </p>
              ) : (
                <div className="space-y-5">
                  <FormField
                    htmlFor="race-next-status"
                    label="Siguiente estado"
                  >
                    <select
                      className={fieldControlClassName}
                      disabled={isMutating}
                      id="race-next-status"
                      onChange={(event) => {
                        setSelectedStatus(
                          event.target.value as RaceStatus | '',
                        );
                        setReason('');
                      }}
                      value={selectedStatus}
                    >
                      <option value="">Seleccionar destino</option>
                      {transitions.map((status) => (
                        <option key={status} value={status}>
                          {raceStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {selectedStatus === 'CANCELLED' ? (
                    <FormField
                      hint="El endpoint lo acepta; la implementación actual no lo devuelve ni lo muestra después."
                      htmlFor="race-transition-reason"
                      label="Motivo opcional"
                    >
                      <textarea
                        className={`${fieldControlClassName} min-h-20 resize-y`}
                        id="race-transition-reason"
                        maxLength={500}
                        onChange={(event) => setReason(event.target.value)}
                        value={reason}
                      />
                    </FormField>
                  ) : null}
                  <Button
                    disabled={!selectedStatus || isMutating}
                    onClick={() =>
                      selectedStatus &&
                      setPendingAction({
                        kind: 'status',
                        status: selectedStatus,
                        ...(reason.trim() ? { reason: reason.trim() } : {}),
                      })
                    }
                    size="sm"
                    variant="secondary"
                  >
                    Aplicar transición
                  </Button>
                  <div className="border-t border-border pt-5">
                    <Button
                      disabled={isMutating}
                      onClick={() => setPendingAction({ kind: 'remove' })}
                      variant="danger"
                    >
                      <Trash2 className="size-4" />
                      {race.status === 'DRAFT'
                        ? 'Eliminar o cancelar'
                        : 'Cancelar carrera'}
                    </Button>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Un borrador sin inscripciones se elimina. En los demás
                      casos permitidos se conserva como cancelado.
                    </p>
                  </div>
                </div>
              )}
            </Panel>
          ) : (
            <Panel title="Acceso de consulta">
              <p className="text-sm leading-6 text-muted-foreground">
                Tu rol permite consultar esta carrera. La gestión del ciclo de
                vida está reservada al administrador y al organizador.
              </p>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        busy={isMutating}
        confirmLabel={
          pendingAction?.kind === 'remove'
            ? 'Confirmar operación'
            : 'Cambiar estado'
        }
        description={confirmationDescription(pendingAction, race.name)}
        isOpen={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          setErrorMessage(null);
          if (action?.kind === 'remove') removeMutation.mutate();
          if (action?.kind === 'status')
            statusMutation.mutate({
              status: action.status,
              ...(action.reason ? { reason: action.reason } : {}),
            });
        }}
        title={
          pendingAction?.kind === 'remove'
            ? '¿Eliminar o cancelar carrera?'
            : '¿Confirmar transición?'
        }
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

function confirmationDescription(action: PendingAction, name: string) {
  if (action?.kind === 'remove')
    return `El backend decidirá si ${name} se elimina o se cancela según su estado e historial de inscripciones.`;
  if (action?.kind === 'status')
    return `${name} cambiará a ${raceStatusLabels[action.status]}.${action.reason ? ` Motivo enviado: ${action.reason}` : ''}`;
  return '';
}

function raceConflictMessage(error: Error): string {
  if (!(error instanceof ApiError)) return error.message;
  const message = error.message.toLowerCase();
  if (message.includes('at least two approved'))
    return 'Se necesitan al menos dos participantes aprobados para iniciar la carrera.';
  if (message.includes('every approved participant requires a result'))
    return 'Todos los participantes aprobados deben tener un resultado antes de completar la carrera.';
  if (message.includes('status cannot transition'))
    return 'El estado actual ya no permite esa transición. Actualiza la ficha.';
  if (message.includes('scheduledat must be in the future'))
    return 'La carrera debe seguir programada en el futuro para abrir inscripciones.';
  if (message.includes('cannot be deleted'))
    return 'Una carrera completada o cancelada no puede eliminarse.';
  return error.message;
}
