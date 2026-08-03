import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateResultDto } from './dto/create-result.dto';
import { ResultQueryDto } from './dto/result-query.dto';
import { ResultResponseDto } from './dto/result-response.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { ResultsService } from './results.service';

@Controller()
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(...APP_ROLES)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('races/:raceId/results')
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  async create(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Body() dto: CreateResultDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<ResultResponseDto> {
    return ResultResponseDto.fromEntity(
      await this.resultsService.create(raceId, dto, actor.userProfileId),
    );
  }

  @Get('races/:raceId/results')
  async findAllForRace(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Query() query: ResultQueryDto,
  ): Promise<PaginatedResponseDto<ResultResponseDto>> {
    const result = await this.resultsService.findAllForRace(raceId, query);
    return {
      ...result,
      items: result.items.map((item) => ResultResponseDto.fromEntity(item)),
    };
  }

  @Get('results/:id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ResultResponseDto> {
    return ResultResponseDto.fromEntity(await this.resultsService.findOne(id));
  }

  @Put('results/:id')
  @Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateResultDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<ResultResponseDto> {
    return ResultResponseDto.fromEntity(
      await this.resultsService.update(id, dto, actor.userProfileId),
    );
  }
}
