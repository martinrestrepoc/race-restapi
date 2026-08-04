import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { APP_ROLES } from '../auth/enums/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ActiveUserProfileGuard } from '../users/guards/active-user-profile.guard';
import {
  CompetitorStandingsQueryDto,
  StandingsQueryDto,
  TeamStandingsQueryDto,
} from './dto/standings-query.dto';
import {
  CompetitorStandingResponseDto,
  OverallStandingsResponseDto,
  TeamStandingResponseDto,
} from './dto/standings-response.dto';
import { StandingsService } from './standings.service';

@Controller('standings')
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(...APP_ROLES)
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  getOverall(
    @Query() query: StandingsQueryDto,
  ): Promise<OverallStandingsResponseDto> {
    return this.standingsService.getOverall(query);
  }

  @Get('competitors')
  getCompetitors(
    @Query() query: CompetitorStandingsQueryDto,
  ): Promise<PaginatedResponseDto<CompetitorStandingResponseDto>> {
    return this.standingsService.getCompetitors(query);
  }

  @Get('teams')
  getTeams(
    @Query() query: TeamStandingsQueryDto,
  ): Promise<PaginatedResponseDto<TeamStandingResponseDto>> {
    return this.standingsService.getTeams(query);
  }
}
