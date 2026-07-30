import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TeamStatus } from '../../common/enums/team-status.enum';
import { TeamMember } from './team-member.entity';

@Entity({ name: 'teams' })
@Index('idx_teams_status', ['status'])
@Index('idx_teams_created_at', ['createdAt'])
@Check('chk_teams_name_not_blank', 'length(btrim("name")) > 0')
@Check(
  'chk_teams_responsible_person_not_blank',
  'length(btrim("responsible_person")) > 0',
)
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 150, name: 'responsible_person' })
  responsiblePerson: string;

  @Column({ type: 'enum', enum: TeamStatus, enumName: 'team_status_enum' })
  status: TeamStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TeamMember, (member) => member.team)
  members?: TeamMember[];
}
