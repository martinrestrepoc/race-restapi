import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1787100000000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1787100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        actor_user_profile_id uuid,
        action varchar(100) NOT NULL,
        entity_type varchar(100) NOT NULL,
        entity_id uuid NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        description varchar(1000),
        previous_values jsonb,
        new_values jsonb,
        CONSTRAINT pk_audit_logs PRIMARY KEY (id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_occurred_at ON audit_logs (occurred_at)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_action ON audit_logs (action)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE audit_logs');
  }
}
