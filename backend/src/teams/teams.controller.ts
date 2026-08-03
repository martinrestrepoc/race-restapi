import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { APP_ROLES, AppRole } from '../auth/enums/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedActor } from '../auth/interfaces/authenticated-actor.interface';
import { ActiveUserProfileGuard } from '../users/guards/active-user-profile.guard';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamDetailResponseDto } from './dto/team-detail-response.dto';
import { TeamMemberResponseDto } from './dto/team-member-response.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamStatusDto } from './dto/update-team-status.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(...APP_ROLES)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(AppRole.ADMINISTRATOR)
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<TeamResponseDto> {
    const team = await this.teamsService.create(dto, actor.userProfileId);
    return TeamResponseDto.fromEntity(team);
  }

  @Get()
  async findAll(
    @Query() query: TeamQueryDto,
  ): Promise<PaginatedResponseDto<TeamResponseDto>> {
    const result = await this.teamsService.findAll(query);

    return {
      ...result,
      items: result.items.map((team) => TeamResponseDto.fromEntity(team)),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TeamDetailResponseDto> {
    const team = await this.teamsService.findOne(id);
    return TeamDetailResponseDto.fromEntity(team);
  }

  @Put(':id')
  @Roles(AppRole.ADMINISTRATOR)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<TeamDetailResponseDto> {
    const team = await this.teamsService.update(id, dto, actor.userProfileId);
    return TeamDetailResponseDto.fromEntity(team);
  }

  @Patch(':id/status')
  @Roles(AppRole.ADMINISTRATOR)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTeamStatusDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<TeamDetailResponseDto> {
    const team = await this.teamsService.updateStatus(
      id,
      dto.status,
      actor.userProfileId,
    );
    return TeamDetailResponseDto.fromEntity(team);
  }

  @Delete(':id')
  @Roles(AppRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<void> {
    await this.teamsService.remove(id, actor.userProfileId);
  }

  @Post(':teamId/members/:competitorId')
  @Roles(AppRole.ADMINISTRATOR)
  async addMember(
    @Param('teamId', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Param('competitorId', new ParseUUIDPipe({ version: '4' }))
    competitorId: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamsService.addMember(
      teamId,
      competitorId,
      actor.userProfileId,
    );
    return TeamMemberResponseDto.fromEntity(member);
  }

  @Delete(':teamId/members/:competitorId')
  @Roles(AppRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('teamId', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Param('competitorId', new ParseUUIDPipe({ version: '4' }))
    competitorId: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<void> {
    await this.teamsService.removeMember(
      teamId,
      competitorId,
      actor.userProfileId,
    );
  }
}
