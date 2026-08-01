import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/database/numeric.transformer';
import { ResultStatus } from '../../common/enums/result-status.enum';
import { Race } from '../../races/entities/race.entity';
import { RaceRegistration } from '../../registrations/entities/race-registration.entity';

@Entity({ name: 'race_results' })
@Index('idx_results_race_status', ['raceId', 'status'])
@Index('uq_results_registration', ['registrationId'], { unique: true })
@Index('uq_results_race_final_position', ['raceId', 'finalPosition'], {
  unique: true,
  where: '"status" = \'FINISHED\' AND "final_position" IS NOT NULL',
})
@Check('chk_results_starting_position_positive', '"starting_position" > 0')
@Check(
  'chk_results_final_position_positive',
  '"final_position" IS NULL OR "final_position" > 0',
)
@Check(
  'chk_results_raw_time_non_negative',
  '"raw_time_ms" IS NULL OR "raw_time_ms" >= 0',
)
@Check('chk_results_penalty_time_non_negative', '"penalty_time_ms" >= 0')
@Check(
  'chk_results_final_time_non_negative',
  '"final_time_ms" IS NULL OR "final_time_ms" >= 0',
)
@Check(
  'chk_results_values_match_status',
  `(
    "status" = 'FINISHED'
    AND "final_position" IS NOT NULL
    AND "raw_time_ms" > 0
    AND "final_time_ms" = "raw_time_ms" + "penalty_time_ms"
  ) OR (
    "status" <> 'FINISHED'
    AND "final_position" IS NULL
    AND "raw_time_ms" IS NULL
    AND "penalty_time_ms" = 0
    AND "final_time_ms" IS NULL
  )`,
)
export class RaceResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'race_id' })
  raceId: string;

  @Column({ type: 'uuid', name: 'registration_id', unique: true })
  registrationId: string;

  @Column({ type: 'integer', name: 'starting_position' })
  startingPosition: number;

  @Column({ type: 'integer', name: 'final_position', nullable: true })
  finalPosition: number | null;

  @Column({
    type: 'bigint',
    name: 'raw_time_ms',
    nullable: true,
    transformer: numericTransformer,
  })
  rawTimeMs: number | null;

  @Column({
    type: 'bigint',
    name: 'penalty_time_ms',
    transformer: numericTransformer,
  })
  penaltyTimeMs: number;

  @Column({
    type: 'bigint',
    name: 'final_time_ms',
    nullable: true,
    transformer: numericTransformer,
  })
  finalTimeMs: number | null;

  @Column({ type: 'enum', enum: ResultStatus, enumName: 'result_status_enum' })
  status: ResultStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', name: 'recorded_by_user_profile_id', nullable: true })
  recordedByUserProfileId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Race, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'race_id', foreignKeyConstraintName: 'fk_results_race' })
  race: Race;

  @OneToOne(() => RaceRegistration, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'registration_id',
    foreignKeyConstraintName: 'fk_results_registration',
  })
  registration: RaceRegistration;
}
