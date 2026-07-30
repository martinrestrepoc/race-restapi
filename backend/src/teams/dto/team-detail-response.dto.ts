import { Team } from '../entities/team.entity';
import { TeamMemberResponseDto } from './team-member-response.dto';
import { TeamResponseDto } from './team-response.dto';

export class TeamDetailResponseDto extends TeamResponseDto {
  members: TeamMemberResponseDto[];

  static fromEntity(team: Team): TeamDetailResponseDto {
    return {
      ...TeamResponseDto.fromEntity(team),
      members: (team.members ?? []).map((member) =>
        TeamMemberResponseDto.fromEntity(member),
      ),
    };
  }
}
