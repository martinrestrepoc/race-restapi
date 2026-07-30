import { TeamStatus } from '../../common/enums/team-status.enum';
import { Team } from '../entities/team.entity';

export class TeamResponseDto {
  id: string;
  name: string;
  description: string | null;
  responsiblePerson: string;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;

  static fromEntity(team: Team): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      responsiblePerson: team.responsiblePerson,
      status: team.status,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }
}
