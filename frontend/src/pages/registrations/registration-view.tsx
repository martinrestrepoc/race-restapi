/* eslint-disable react-refresh/only-export-components */
import type { RegistrationStatus } from '@/api/domain.types';
import { ApiError } from '@/api/api-errors';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { registrationStatusLabels } from '@/types/labels';

export const registrationStatuses = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const satisfies readonly RegistrationStatus[];

const tones: Record<RegistrationStatus, StatusBadgeTone> = {
  APPROVED: 'success',
  CANCELLED: 'neutral',
  PENDING: 'warning',
  REJECTED: 'danger',
};

export function RegistrationStatusBadge({
  status,
}: {
  status: RegistrationStatus;
}) {
  return (
    <StatusBadge tone={tones[status]}>
      {registrationStatusLabels[status]}
    </StatusBadge>
  );
}

const conflictTranslations: readonly (readonly [string, string])[] = [
  [
    'Race registration window is closed',
    'La ventana de inscripciones de la carrera está cerrada.',
  ],
  [
    'Individual participants cannot enter a team race',
    'Una persona competidora no puede inscribirse en una carrera por equipos.',
  ],
  [
    'Teams cannot enter an individual race',
    'Un equipo no puede inscribirse en una carrera individual.',
  ],
  [
    'Participant is already registered in this race',
    'El participante ya está inscrito en esta carrera.',
  ],
  [
    'Competitor is already participating through a registered team',
    'La persona competidora ya participa mediante un equipo inscrito.',
  ],
  [
    'A team member is already registered individually in this race',
    'Una persona integrante del equipo ya está inscrita individualmente en esta carrera.',
  ],
  ['has no active members', 'El equipo no tiene integrantes activos.'],
  ['has an ineligible member', 'El equipo tiene una persona no elegible.'],
  ['is not active', 'El participante seleccionado no está activo.'],
  [
    'Only a pending registration can be approved',
    'Solo una inscripción pendiente puede aprobarse.',
  ],
  [
    'Only a pending registration can be rejected',
    'Solo una inscripción pendiente puede rechazarse.',
  ],
  ['has reached its capacity', 'La carrera alcanzó su capacidad máxima.'],
  [
    'Starting position',
    'La posición de salida ya está asignada en esta carrera.',
  ],
  [
    'cannot be cancelled',
    'La inscripción ya no puede cancelarse en su estado actual.',
  ],
];

export function registrationErrorMessage(error: Error): string {
  if (!(error instanceof ApiError)) return error.message;
  const translation = conflictTranslations.find(([fragment]) =>
    error.message.includes(fragment),
  );
  return translation?.[1] ?? error.message;
}
