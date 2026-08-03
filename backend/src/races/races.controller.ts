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
import { CreateRaceDto } from './dto/create-race.dto';
import { RaceQueryDto } from './dto/race-query.dto';
import { RaceResponseDto } from './dto/race-response.dto';
import { UpdateRaceStatusDto } from './dto/update-race-status.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { RacesService } from './races.service';

@Controller('races')
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(...APP_ROLES)
export class RacesController {
  constructor(private readonly racesService: RacesService) {}

  @Post()
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  async create(
    @Body() dto: CreateRaceDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(
      await this.racesService.create(dto, actor.userProfileId),
    );
  }

  @Get()
  async findAll(
    @Query() query: RaceQueryDto,
  ): Promise<PaginatedResponseDto<RaceResponseDto>> {
    const result = await this.racesService.findAll(query);
    return {
      ...result,
      items: result.items.map((race) => RaceResponseDto.fromEntity(race)),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(await this.racesService.findOne(id));
  }

  @Put(':id')
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRaceDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(
      await this.racesService.update(id, dto, actor.userProfileId),
    );
  }

  @Patch(':id/status')
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRaceStatusDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(
      await this.racesService.updateStatus(id, dto.status, actor.userProfileId),
    );
  }

  @Delete(':id')
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<void> {
    await this.racesService.remove(id, actor.userProfileId);
  }
}
