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
import { CreateRaceDto } from './dto/create-race.dto';
import { RaceQueryDto } from './dto/race-query.dto';
import { RaceResponseDto } from './dto/race-response.dto';
import { UpdateRaceStatusDto } from './dto/update-race-status.dto';
import { UpdateRaceDto } from './dto/update-race.dto';
import { RacesService } from './races.service';

@Controller('races')
export class RacesController {
  constructor(private readonly racesService: RacesService) {}

  @Post()
  async create(@Body() dto: CreateRaceDto): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(await this.racesService.create(dto));
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
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRaceDto,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(await this.racesService.update(id, dto));
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRaceStatusDto,
  ): Promise<RaceResponseDto> {
    return RaceResponseDto.fromEntity(
      await this.racesService.updateStatus(id, dto.status),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.racesService.remove(id);
  }
}
