import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '@/api/api-errors';
import type { CompetitorStatus } from '@/api/domain.types';
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
import { competitorStatusLabels } from '@/types/labels';
import {
  competitorStatusTransitions,
  CompetitorStatusBadge,
  competitorTypeLabel,
  formatDate,
  formatDateTime,
} from './competitor-view';

type PendingAction =
  { kind: 'delete' } | { kind: 'status'; status: CompetitorStatus } | null;

export function CompetitorDetailPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdministrator = roles.includes('ADMINISTRATOR');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [selectedStatus, setSelectedStatus] = useState<CompetitorStatus | ''>(
    '',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const competitorQuery = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.competitors.detail(id, signal),
    queryKey: queryKeys.competitors.detail(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: CompetitorStatus) =>
      resources.competitors.updateStatus(id, status),
    onError: (error: Error) => setErrorMessage(statusErrorMessage(error)),
    onSuccess: async (competitor) => {
      queryClient.setQueryData(queryKeys.competitors.detail(id), competitor);
      await invalidateResources(queryClient, mutationInvalidation.competitor);
      setSelectedStatus('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => resources.competitors.remove(id),
    onError: (error: Error) => setErrorMessage(error.message),
    onSuccess: async () => {
      await invalidateResources(queryClient, mutationInvalidation.competitor);
      void navigate('/competitors', {
        replace: true,
        state: {
          message:
            'El competidor fue eliminado o retirado según su historial.',
          title: 'Operación completada',
        },
      });
    },
  });

  if (competitorQuery.isPending) return <LoadingState />;
  if (competitorQuery.isError) {
    return (
      <ErrorState
        description={competitorQuery.error.message}
        onRetry={() => void competitorQuery.refetch()}
        title="No fue posible cargar el competidor"
      />
    );
  }

  const competitor = competitorQuery.data;
  const allowedStatuses = competitorStatusTransitions[competitor.status];
  const isMutating = statusMutation.isPending || deleteMutation.isPending;

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
              to="/competitors"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver
            </Link>
            {isAdministrator ? (
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                to={`/competitors/${competitor.id}/edit`}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Editar
              </Link>
            ) : null}
          </>
        }
        description={`Apodo oficial: ${competitor.nickname}`}
        eyebrow="Ficha de competidor"
        title={competitor.name}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          action={<CompetitorStatusBadge status={competitor.status} />}
          title="Datos registrados"
        >
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <Datum label="Nombre" value={competitor.name} />
            <Datum label="Apodo" value={competitor.nickname} />
            <Datum label="Tipo" value={competitorTypeLabel(competitor.type)} />
            <Datum
              label="Fecha de nacimiento"
              value={formatDate(competitor.dateOfBirth)}
            />
            <Datum label="Peso" value={`${competitor.weight} kg`} />
            <Datum label="Altura" value={`${competitor.height} cm`} />
            <Datum label="Origen" value={competitor.origin} />
            <Datum
              label="Registrado"
              value={formatDateTime(competitor.registeredAt)}
            />
            <Datum
              label="Última actualización"
              value={formatDateTime(competitor.updatedAt)}
            />
          </dl>
        </Panel>

        {isAdministrator ? (
          <Panel
            description="El cambio debe respetar el estado actual del competidor."
            title="Administración"
          >
            <div className="space-y-5">
              {allowedStatuses.length > 0 ? (
                <FormField
                  htmlFor="competitor-next-status"
                  label="Cambiar estado"
                >
                  <div className="flex gap-2">
                    <select
                      className={fieldControlClassName}
                      disabled={isMutating}
                      id="competitor-next-status"
                      onChange={(event) =>
                        setSelectedStatus(
                          event.target.value as CompetitorStatus | '',
                        )
                      }
                      value={selectedStatus}
                    >
                      <option value="">Seleccionar destino</option>
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {competitorStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                    <Button
                      disabled={!selectedStatus || isMutating}
                      onClick={() =>
                        selectedStatus &&
                        setPendingAction({
                          kind: 'status',
                          status: selectedStatus,
                        })
                      }
                      size="sm"
                      variant="secondary"
                    >
                      Aplicar
                    </Button>
                  </div>
                </FormField>
              ) : (
                <p className="rounded-md border border-border bg-background/50 p-3 text-xs leading-5 text-muted-foreground">
                  Retirado es un estado terminal; no existen transiciones
                  disponibles.
                </p>
              )}

              <div className="border-t border-border pt-5">
                <Button
                  disabled={isMutating}
                  onClick={() => setPendingAction({ kind: 'delete' })}
                  variant="danger"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Eliminar o retirar
                </Button>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Sin historial se elimina físicamente; con membresías o
                  inscripciones se conserva como retirado.
                </p>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Acceso de consulta">
            <p className="text-sm leading-6 text-muted-foreground">
              Tu rol permite consultar esta ficha. Las modificaciones están
              reservadas al administrador.
            </p>
          </Panel>
        )}
      </div>

      <ConfirmDialog
        busy={isMutating}
        confirmLabel={
          pendingAction?.kind === 'delete'
            ? 'Confirmar operación'
            : 'Cambiar estado'
        }
        description={confirmationDescription(pendingAction, competitor.name)}
        isOpen={pendingAction !== null}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          setErrorMessage(null);
          if (action?.kind === 'delete') deleteMutation.mutate();
          if (action?.kind === 'status') statusMutation.mutate(action.status);
        }}
        title={
          pendingAction?.kind === 'delete'
            ? '¿Eliminar o retirar competidor?'
            : '¿Confirmar cambio de estado?'
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

function confirmationDescription(action: PendingAction, name: string): string {
  if (action?.kind === 'status')
    return `El estado de ${name} cambiará a ${competitorStatusLabels[action.status]}.`;
  if (action?.kind === 'delete')
    return `${name} se eliminará si no tiene historial; de lo contrario se retirará. Esta operación requiere confirmación.`;
  return '';
}

function statusErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'El estado actual ya no permite esa transición. Actualiza la ficha y vuelve a intentarlo.';
  }
  return error.message;
}
