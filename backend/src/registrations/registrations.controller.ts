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
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppRole } from '../auth/enums/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedActor } from '../auth/interfaces/authenticated-actor.interface';
import { ActiveUserProfileGuard } from '../users/guards/active-user-profile.guard';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ApproveRegistrationDto } from './dto/approve-registration.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationQueryDto } from './dto/registration-query.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { RejectRegistrationDto } from './dto/reject-registration.dto';
import { RegistrationsService } from './registrations.service';

@Controller()
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(AppRole.ADMINISTRATOR, AppRole.RACE_ORGANIZER)
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('races/:raceId/registrations')
  async create(
    @Param('raceId', new ParseUUIDPipe({ version: '4' })) raceId: string,
    @Body() dto: CreateRegistrationDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.create(raceId, dto, actor.userProfileId),
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
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.approve(
        id,
        dto.startingPosition,
        actor.userProfileId,
      ),
    );
  }

  @Patch('registrations/:id/reject')
  async reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<RegistrationResponseDto> {
    return RegistrationResponseDto.fromEntity(
      await this.registrationsService.reject(
        id,
        dto.reason,
        actor.userProfileId,
      ),
    );
  }

  @Delete('registrations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<void> {
    await this.registrationsService.cancel(id, actor.userProfileId);
  }
}
