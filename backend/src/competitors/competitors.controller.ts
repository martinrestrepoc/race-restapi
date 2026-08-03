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
import { CompetitorQueryDto } from './dto/competitor-query.dto';
import { CompetitorResponseDto } from './dto/competitor-response.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorStatusDto } from './dto/update-competitor-status.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { CompetitorsService } from './competitors.service';

@Controller('competitors')
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(...APP_ROLES)
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Post()
  @Roles(AppRole.ADMINISTRATOR)
  async create(
    @Body() dto: CreateCompetitorDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.create(
      dto,
      actor.userProfileId,
    );
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Get()
  async findAll(
    @Query() query: CompetitorQueryDto,
  ): Promise<PaginatedResponseDto<CompetitorResponseDto>> {
    const result = await this.competitorsService.findAll(query);

    return {
      ...result,
      items: result.items.map((competitor) =>
        CompetitorResponseDto.fromEntity(competitor),
      ),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.findOne(id);
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Put(':id')
  @Roles(AppRole.ADMINISTRATOR)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCompetitorDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.update(
      id,
      dto,
      actor.userProfileId,
    );
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Patch(':id/status')
  @Roles(AppRole.ADMINISTRATOR)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCompetitorStatusDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.updateStatus(
      id,
      dto.status,
      actor.userProfileId,
    );
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Delete(':id')
  @Roles(AppRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<void> {
    await this.competitorsService.remove(id, actor.userProfileId);
  }
}
