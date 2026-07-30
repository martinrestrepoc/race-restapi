import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Competitor } from '../../competitors/entities/competitor.entity';
import { Team } from './team.entity';

@Entity({ name: 'team_members' })
@Index('idx_team_members_team_competitor', ['teamId', 'competitorId'])
@Index('idx_team_members_team_active', ['teamId'], {
  where: '"left_at" IS NULL',
})
@Index('uq_team_members_active_competitor', ['competitorId'], {
  unique: true,
  where: '"left_at" IS NULL',
})
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'team_id' })
  teamId: string;

  @Column({ type: 'uuid', name: 'competitor_id' })
  competitorId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'joined_at' })
  joinedAt: Date;

  @Column({ type: 'timestamptz', name: 'left_at', nullable: true })
  leftAt: Date | null;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'team_id',
    foreignKeyConstraintName: 'fk_team_members_team',
  })
  team: Team;

  @ManyToOne(() => Competitor, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'competitor_id',
    foreignKeyConstraintName: 'fk_team_members_competitor',
  })
  competitor: Competitor;
}
