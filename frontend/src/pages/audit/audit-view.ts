export function auditLabel(value: string): string {
  const words: Record<string, string> = {
    ADDED: 'agregado',
    APPROVED: 'aprobada',
    CANCELLED: 'cancelada',
    CHANGED: 'cambiado',
    COMPETITOR: 'competidor',
    CORRECTED: 'corregido',
    CREATED: 'creado',
    DEACTIVATED: 'desactivado',
    DELETED: 'eliminado',
    MEMBER: 'integrante',
    PROFILE: 'perfil',
    RACE: 'carrera',
    REGISTRATION: 'inscripción',
    REJECTED: 'rechazada',
    REMOVED: 'retirado',
    RESULT: 'resultado',
    RETIRED: 'retirado',
    STATUS: 'estado',
    TEAM: 'equipo',
    UPDATED: 'actualizado',
    USER: 'usuario',
  };
  const label = value
    .split('_')
    .map((word) => words[word] ?? word.toLocaleLowerCase('es'))
    .join(' ');
  return label.charAt(0).toLocaleUpperCase('es') + label.slice(1);
}
