import { ArrowLeft } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { UserProfileStatus } from '@/auth/auth.types';
import { useApi } from '@/api/use-api';
import { useAuth } from '@/auth/use-auth';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/feedback/FeedbackState';
import { Toast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { formatDateTime } from '@/pages/races/race-view';
import {
  userProfileStatusLabels,
  userStatusErrorMessage,
  UserStatusBadge,
} from './user-view';

export function UserDetailPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const { profile: currentProfile } = useAuth();
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<UserProfileStatus | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const profileQuery = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.users.detail(id, signal),
    queryKey: queryKeys.users.detail(id),
  });
  const mutation = useMutation({
    mutationFn: (status: UserProfileStatus) =>
      resources.users.updateStatus(id, status),
    onError: (error: Error) => {
      setPendingStatus(null);
      setErrorMessage(userStatusErrorMessage(error));
    },
    onSuccess: async (profile) => {
      setPendingStatus(null);
      setSuccessMessage('El estado del usuario fue actualizado.');
      queryClient.setQueryData(queryKeys.users.detail(id), profile);
      await invalidateResources(queryClient, mutationInvalidation.user);
    },
  });

  if (profileQuery.isPending) return <LoadingState />;
  if (profileQuery.isError)
    return (
      <ErrorState
        description="No fue posible consultar el perfil."
        onRetry={() => void profileQuery.refetch()}
        title="Error al cargar"
      />
    );
  const profile = profileQuery.data;
  const isSelf = currentProfile?.id === profile.id;
  const targetStatus: UserProfileStatus =
    profile.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const selfDisable = isSelf && targetStatus === 'DISABLED';

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <Toast
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
          title="No se pudo cambiar el estado"
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
            to="/users"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver
          </Link>
        }
        description={profile.emailSnapshot ?? 'Sin correo disponible'}
        eyebrow="Usuario"
        title={profile.displayName}
      />
      <Panel
        action={<UserStatusBadge status={profile.status} />}
        title="Información del usuario"
      >
        <dl className="grid gap-6 sm:grid-cols-2">
          <Datum label="Creación" value={formatDateTime(profile.createdAt)} />
          <Datum
            label="Actualización"
            value={formatDateTime(profile.updatedAt)}
          />
        </dl>
      </Panel>
      <Panel
        description="Habilita o restringe el acceso de este usuario a la aplicación."
        title="Estado de acceso"
      >
        <Button
          disabled={mutation.isPending || selfDisable}
          onClick={() => setPendingStatus(targetStatus)}
          variant={targetStatus === 'DISABLED' ? 'danger' : 'primary'}
        >
          {targetStatus === 'DISABLED'
            ? 'Deshabilitar perfil'
            : 'Reactivar perfil'}
        </Button>
        {selfDisable ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No puedes deshabilitar tu propio perfil activo.
          </p>
        ) : null}
      </Panel>
      <ConfirmDialog
        busy={mutation.isPending}
        confirmLabel={
          targetStatus === 'DISABLED' ? 'Deshabilitar' : 'Reactivar'
        }
        description={`El usuario cambiará al estado ${userProfileStatusLabels[targetStatus]}.`}
        isOpen={pendingStatus !== null}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => {
          if (!pendingStatus) return;
          const status = pendingStatus;
          setPendingStatus(null);
          mutation.mutate(status);
        }}
        title="¿Cambiar el estado del usuario?"
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
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}
