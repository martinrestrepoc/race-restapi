/* eslint-disable react-refresh/only-export-components */
import type { UserProfileStatus } from '@/auth/auth.types';
import { ApiError } from '@/api/api-errors';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const userProfileStatuses = [
  'ACTIVE',
  'DISABLED',
] as const satisfies readonly UserProfileStatus[];
export const userProfileStatusLabels: Record<UserProfileStatus, string> = {
  ACTIVE: 'Activo',
  DISABLED: 'Deshabilitado',
};

export function UserStatusBadge({ status }: { status: UserProfileStatus }) {
  return (
    <StatusBadge tone={status === 'ACTIVE' ? 'success' : 'danger'}>
      {userProfileStatusLabels[status]}
    </StatusBadge>
  );
}

export function userStatusErrorMessage(error: Error): string {
  if (!(error instanceof ApiError)) return error.message;
  if (error.message.includes('cannot disable their own active profile'))
    return 'No puedes deshabilitar tu propio perfil activo.';
  if (error.message.includes('status is already'))
    return 'El perfil ya se encuentra en ese estado.';
  return error.message;
}
