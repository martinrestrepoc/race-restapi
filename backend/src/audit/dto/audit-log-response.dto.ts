import { AuditLog } from '../entities/audit-log.entity';

export class AuditLogResponseDto {
  id: string;
  actorUserProfileId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  description: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;

  static fromEntity(entry: AuditLog): AuditLogResponseDto {
    return {
      id: entry.id,
      actorUserProfileId: entry.actorUserProfileId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      occurredAt: entry.occurredAt.toISOString(),
      description: entry.description,
      previousValues: entry.previousValues,
      newValues: entry.newValues,
    };
  }
}
