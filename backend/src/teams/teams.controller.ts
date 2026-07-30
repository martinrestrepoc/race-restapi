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
} from '@nestjs/common';
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
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async create(@Body() dto: CreateTeamDto): Promise<TeamResponseDto> {
    const team = await this.teamsService.create(dto);
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
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamDetailResponseDto> {
    const team = await this.teamsService.update(id, dto);
    return TeamDetailResponseDto.fromEntity(team);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTeamStatusDto,
  ): Promise<TeamDetailResponseDto> {
    const team = await this.teamsService.updateStatus(id, dto.status);
    return TeamDetailResponseDto.fromEntity(team);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.teamsService.remove(id);
  }

  @Post(':teamId/members/:competitorId')
  async addMember(
    @Param('teamId', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Param('competitorId', new ParseUUIDPipe({ version: '4' }))
    competitorId: string,
  ): Promise<TeamMemberResponseDto> {
    const member = await this.teamsService.addMember(teamId, competitorId);
    return TeamMemberResponseDto.fromEntity(member);
  }

  @Delete(':teamId/members/:competitorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('teamId', new ParseUUIDPipe({ version: '4' })) teamId: string,
    @Param('competitorId', new ParseUUIDPipe({ version: '4' }))
    competitorId: string,
  ): Promise<void> {
    await this.teamsService.removeMember(teamId, competitorId);
  }
}
