import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultQueryDto } from './dto/result-query.dto';
import { ResultResponseDto } from './dto/result-response.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { ResultsService } from './results.service';

@Controller()
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('races/:raceId/results')
  async create(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Body() dto: CreateResultDto,
  ): Promise<ResultResponseDto> {
    return ResultResponseDto.fromEntity(
      await this.resultsService.create(raceId, dto),
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
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateResultDto,
  ): Promise<ResultResponseDto> {
    return ResultResponseDto.fromEntity(
      await this.resultsService.update(id, dto),
    );
  }
}
