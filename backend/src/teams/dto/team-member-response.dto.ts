import { CompetitorResponseDto } from '../../competitors/dto/competitor-response.dto';
import { TeamMember } from '../entities/team-member.entity';

export class TeamMemberResponseDto {
  id: string;
  joinedAt: string;
  leftAt: string | null;
  competitor: CompetitorResponseDto;

  static fromEntity(member: TeamMember): TeamMemberResponseDto {
    return {
      id: member.id,
      joinedAt: member.joinedAt.toISOString(),
      leftAt: member.leftAt?.toISOString() ?? null,
      competitor: CompetitorResponseDto.fromEntity(member.competitor),
    };
  }
}
