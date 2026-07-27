import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompetitorsTable1785100000000 implements MigrationInterface {
  name = 'CreateCompetitorsTable1785100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE competitor_type_enum AS ENUM ('DWARF', 'CAMEL', 'MEDIUM', 'OTHER')",
    );
    await queryRunner.query(
      "CREATE TYPE competitor_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'RETIRED')",
    );
    await queryRunner.query(`
      CREATE TABLE competitors (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        name varchar(150) NOT NULL,
        nickname varchar(80) NOT NULL,
        type competitor_type_enum NOT NULL,
        date_of_birth date NOT NULL,
        weight numeric(6,2) NOT NULL,
        height numeric(5,2) NOT NULL,
        origin varchar(120) NOT NULL,
        status competitor_status_enum NOT NULL,
        registered_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_competitors PRIMARY KEY (id),
        CONSTRAINT uq_competitors_nickname UNIQUE (nickname),
        CONSTRAINT chk_competitors_name_not_blank CHECK (length(btrim(name)) > 0),
        CONSTRAINT chk_competitors_nickname_not_blank CHECK (length(btrim(nickname)) > 0),
        CONSTRAINT chk_competitors_origin_not_blank CHECK (length(btrim(origin)) > 0),
        CONSTRAINT chk_competitors_weight_positive CHECK (weight > 0),
        CONSTRAINT chk_competitors_height_positive CHECK (height > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_competitors_type ON competitors (type)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_competitors_status ON competitors (status)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_competitors_registered_at ON competitors (registered_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE competitors');
    await queryRunner.query('DROP TYPE competitor_status_enum');
    await queryRunner.query('DROP TYPE competitor_type_enum');
  }
}
