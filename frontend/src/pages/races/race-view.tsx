/* eslint-disable react-refresh/only-export-components */
import type { RaceStatus, RaceType } from '@/api/domain.types';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { raceStatusLabels, raceTypeLabels } from '@/types/labels';

export const raceStatuses = [
  'DRAFT',
  'OPEN_FOR_REGISTRATION',
  'CLOSED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const satisfies readonly RaceStatus[];

export const raceTypes = [
  'INDIVIDUAL',
  'TEAM',
  'MIXED',
] as const satisfies readonly RaceType[];

export const raceStatusTransitions: Record<RaceStatus, readonly RaceStatus[]> =
  {
    CANCELLED: [],
    CLOSED: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    DRAFT: ['OPEN_FOR_REGISTRATION', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    OPEN_FOR_REGISTRATION: ['CLOSED', 'CANCELLED'],
  };

const tones: Record<RaceStatus, StatusBadgeTone> = {
  CANCELLED: 'danger',
  CLOSED: 'warning',
  COMPLETED: 'success',
  DRAFT: 'neutral',
  IN_PROGRESS: 'primary',
  OPEN_FOR_REGISTRATION: 'info',
};

export function RaceStatusBadge({ status }: { status: RaceStatus }) {
  return (
    <StatusBadge tone={tones[status]}>{raceStatusLabels[status]}</StatusBadge>
  );
}

export function raceTypeLabel(type: RaceType): string {
  return raceTypeLabels[type];
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

export function browserTimeZoneLabel(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'zona local';
}

export function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
