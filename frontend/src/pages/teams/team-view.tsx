/* eslint-disable react-refresh/only-export-components */
import type { TeamStatus } from '@/api/domain.types';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { teamStatusLabels } from '@/types/labels';

export const teamStatuses = [
  'ACTIVE',
  'INACTIVE',
] as const satisfies readonly TeamStatus[];

const statusTones: Record<TeamStatus, StatusBadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  return (
    <StatusBadge tone={statusTones[status]}>
      {teamStatusLabels[status]}
    </StatusBadge>
  );
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}
