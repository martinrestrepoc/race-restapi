/* eslint-disable react-refresh/only-export-components */
import type { CompetitorStatus, CompetitorType } from '@/api/domain.types';
import { competitorStatusLabels, competitorTypeLabels } from '@/types/labels';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';

export const competitorStatuses = [
  'ACTIVE',
  'SUSPENDED',
  'RETIRED',
] as const satisfies readonly CompetitorStatus[];

export const competitorTypes = [
  'DWARF',
  'CAMEL',
  'MEDIUM',
  'OTHER',
] as const satisfies readonly CompetitorType[];

export const competitorStatusTransitions: Record<
  CompetitorStatus,
  readonly CompetitorStatus[]
> = {
  ACTIVE: ['SUSPENDED', 'RETIRED'],
  SUSPENDED: ['ACTIVE', 'RETIRED'],
  RETIRED: [],
};

const statusTones: Record<CompetitorStatus, StatusBadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  RETIRED: 'neutral',
};

export function CompetitorStatusBadge({
  status,
}: {
  status: CompetitorStatus;
}) {
  return (
    <StatusBadge tone={statusTones[status]}>
      {competitorStatusLabels[status]}
    </StatusBadge>
  );
}

export function competitorTypeLabel(type: CompetitorType): string {
  return competitorTypeLabels[type];
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
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
