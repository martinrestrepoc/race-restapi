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
import { CompetitorQueryDto } from './dto/competitor-query.dto';
import { CompetitorResponseDto } from './dto/competitor-response.dto';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorStatusDto } from './dto/update-competitor-status.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { CompetitorsService } from './competitors.service';

@Controller('competitors')
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Post()
  async create(
    @Body() dto: CreateCompetitorDto,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.create(dto);
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
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCompetitorDto,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.update(id, dto);
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCompetitorStatusDto,
  ): Promise<CompetitorResponseDto> {
    const competitor = await this.competitorsService.updateStatus(
      id,
      dto.status,
    );
    return CompetitorResponseDto.fromEntity(competitor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.competitorsService.remove(id);
  }
}
