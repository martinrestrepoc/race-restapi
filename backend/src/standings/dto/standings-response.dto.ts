import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CompetitorStatus } from '../../common/enums/competitor-status.enum';
import { CompetitorType } from '../../common/enums/competitor-type.enum';
import { ResultStatus } from '../../common/enums/result-status.enum';
import { TeamStatus } from '../../common/enums/team-status.enum';

export class CompetitorStandingResponseDto {
  position: number;
  competitorId: string;
  name: string;
  nickname: string;
  type: CompetitorType;
  status: CompetitorStatus;
  totalPoints: number;
  wins: number;
  secondPlaces: number;
  racesCompleted: number;
  bestFinalTimeMs: number | null;
}

export class TeamStandingResponseDto {
  position: number;
  teamId: string;
  name: string;
  status: TeamStatus;
  totalPoints: number;
  wins: number;
  secondPlaces: number;
  racesCompleted: number;
  bestFinalTimeMs: number | null;
}

export interface PointsTableEntryResponseDto {
  position: number;
  points: number;
}

export class OverallStandingsResponseDto {
  pointsTable: PointsTableEntryResponseDto[];
  zeroPointResultStatuses: ResultStatus[];
  competitors: PaginatedResponseDto<CompetitorStandingResponseDto>;
  teams: PaginatedResponseDto<TeamStandingResponseDto>;
}
