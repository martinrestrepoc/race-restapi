export const appRoleLabels = {
  ADMINISTRATOR: 'Administrador',
  RACE_ORGANIZER: 'Organizador de carreras',
  VIEWER: 'Consultor',
} as const;

export const competitorStatusLabels = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  RETIRED: 'Retirado',
} as const;

export const competitorTypeLabels = {
  DWARF: 'Enano',
  CAMEL: 'Camello',
  MEDIUM: 'Mediano',
  OTHER: 'Otro',
} as const;

export const teamStatusLabels = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
} as const;

export const raceStatusLabels = {
  DRAFT: 'Borrador',
  OPEN_FOR_REGISTRATION: 'Inscripciones abiertas',
  CLOSED: 'Inscripciones cerradas',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
} as const;

export const raceTypeLabels = {
  INDIVIDUAL: 'Individual',
  TEAM: 'Por equipos',
  MIXED: 'Mixta',
} as const;

export const registrationStatusLabels = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
} as const;

export const resultStatusLabels = {
  FINISHED: 'Finalizó',
  DISQUALIFIED: 'Descalificado',
  DID_NOT_FINISH: 'No finalizó',
  DID_NOT_START: 'No inició',
} as const;
