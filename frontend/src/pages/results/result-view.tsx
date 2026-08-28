/* eslint-disable react-refresh/only-export-components */
import type { ResultStatus } from '@/api/domain.types';
import { ApiError } from '@/api/api-errors';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { resultStatusLabels } from '@/types/labels';

export const resultStatuses = [
  'FINISHED',
  'DISQUALIFIED',
  'DID_NOT_FINISH',
  'DID_NOT_START',
] as const satisfies readonly ResultStatus[];

const tones: Record<ResultStatus, StatusBadgeTone> = {
  DID_NOT_FINISH: 'warning',
  DID_NOT_START: 'neutral',
  DISQUALIFIED: 'danger',
  FINISHED: 'success',
};

export function ResultStatusBadge({ status }: { status: ResultStatus }) {
  return (
    <StatusBadge tone={tones[status]}>{resultStatusLabels[status]}</StatusBadge>
  );
}

export function parseDuration(value: string): number | null {
  const match = /^(\d+):([0-5]\d)\.(\d{3})$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const milliseconds = Number(match[3]);
  const total = (minutes * 60 + seconds) * 1000 + milliseconds;
  return Number.isSafeInteger(total) ? total : null;
}

export function formatDuration(value: number | null): string {
  if (value === null) return '—';
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  const milliseconds = value % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

const conflictTranslations: readonly (readonly [string, string])[] = [
  [
    'Results can be recorded only while the race is in progress',
    'Los resultados solo pueden registrarse mientras la carrera está en curso.',
  ],
  [
    'Results can be corrected only during or after the race',
    'Los resultados solo pueden corregirse durante la carrera o después de finalizarla.',
  ],
  [
    'Only an approved registration with a starting position can receive a result',
    'Solo una inscripción aprobada con posición de salida puede recibir un resultado.',
  ],
  [
    'Registration already has a result or final position is already assigned',
    'La inscripción ya tiene resultado o la posición final ya está asignada.',
  ],
  [
    'Registration already has a result',
    'La inscripción ya tiene un resultado registrado.',
  ],
  ['Final position', 'La posición final ya está asignada en esta carrera.'],
  [
    'The winner must have the lowest final time',
    'El ganador debe tener el menor tiempo final de la carrera.',
  ],
  [
    'A finished result requires rawTimeMs and finalPosition',
    'Un resultado finalizado requiere tiempo bruto y posición final.',
  ],
  [
    'Non-finished results cannot have rawTimeMs or finalPosition',
    'Un resultado no finalizado no puede incluir tiempo bruto ni posición final.',
  ],
  [
    'Non-finished results cannot have penalty time',
    'Un resultado no finalizado debe tener penalización cero.',
  ],
];

export function resultErrorMessage(error: Error): string {
  if (!(error instanceof ApiError)) return error.message;
  const translation = conflictTranslations.find(([fragment]) =>
    error.message.includes(fragment),
  );
  return translation?.[1] ?? error.message;
}
