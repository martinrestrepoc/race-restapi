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
  Query,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApproveRegistrationDto } from './dto/approve-registration.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationQueryDto } from './dto/registration-query.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { RejectRegistrationDto } from './dto/reject-registration.dto';
import { RegistrationsService } from './registrations.service';

@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('races/:raceId/registrations')
  async create(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Body() dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.create(raceId, dto),
    );
  }

  @Get('races/:raceId/registrations')
  async findAllForRace(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Query() query: RegistrationQueryDto,
  ): Promise<PaginatedResponseDto<RegistrationResponseDto>> {
    const result = await this.registrationsService.findAllForRace(
      raceId,
      query,
    );
    return {
      ...result,
      items: result.items.map((item) =>
        RegistrationResponseDto.fromEntity(item),
      ),
    };
  }

  @Get('registrations/:id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.findOne(id),
    );
  }

  @Patch('registrations/:id/approve')
  async approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ApproveRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.approve(id, dto.startingPosition),
    );
  }

  @Patch('registrations/:id/reject')
  async reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.reject(id, dto.reason),
    );
  }

  @Delete('registrations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.registrationsService.cancel(id);
  }
}
