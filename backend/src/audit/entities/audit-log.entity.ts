import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
@Index('idx_audit_logs_occurred_at', ['occurredAt'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_action', ['action'])
@Index('idx_audit_logs_actor', ['actorUserProfileId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'actor_user_profile_id', nullable: true })
  actorUserProfileId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', name: 'previous_values', nullable: true })
  previousValues: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'new_values', nullable: true })
  newValues: Record<string, unknown> | null;
}
