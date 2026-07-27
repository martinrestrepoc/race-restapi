import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/database/numeric.transformer';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';

@Entity({ name: 'competitors' })
@Index('idx_competitors_type', ['type'])
@Index('idx_competitors_status', ['status'])
@Index('idx_competitors_registered_at', ['registeredAt'])
@Check('chk_competitors_name_not_blank', 'length(btrim("name")) > 0')
@Check('chk_competitors_nickname_not_blank', 'length(btrim("nickname")) > 0')
@Check('chk_competitors_origin_not_blank', 'length(btrim("origin")) > 0')
@Check('chk_competitors_weight_positive', '"weight" > 0')
@Check('chk_competitors_height_positive', '"height" > 0')
export class Competitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  nickname: string;

  @Column({
    type: 'enum',
    enum: CompetitorType,
    enumName: 'competitor_type_enum',
  })
  type: CompetitorType;

  @Column({ type: 'date', name: 'date_of_birth' })
  dateOfBirth: string;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  weight: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  height: number;

  @Column({ type: 'varchar', length: 120 })
  origin: string;

  @Column({
    type: 'enum',
    enum: CompetitorStatus,
    enumName: 'competitor_status_enum',
  })
  status: CompetitorStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'registered_at' })
  registeredAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
