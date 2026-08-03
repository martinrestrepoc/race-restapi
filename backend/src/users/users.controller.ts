import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { APP_ROLES, AppRole } from '../auth/enums/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { AuthenticatedActor } from '../auth/interfaces/authenticated-actor.interface';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ActiveUserProfileGuard } from './guards/active-user-profile.guard';
import { UserProfileQueryDto } from './dto/user-profile-query.dto';
import { UpdateUserProfileStatusDto } from './dto/update-user-profile-status.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...APP_ROLES)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileResponseDto> {
    return UserProfileResponseDto.fromEntity(
      await this.usersService.findOrProvision(user),
    );
  }

  @Get()
  @Roles(AppRole.ADMINISTRATOR)
  @UseGuards(ActiveUserProfileGuard)
  async findAll(
    @Query() query: UserProfileQueryDto,
  ): Promise<PaginatedResponseDto<UserProfileResponseDto>> {
    const result = await this.usersService.findAll(query);
    return {
      ...result,
      items: result.items.map((profile) =>
        UserProfileResponseDto.fromEntity(profile),
      ),
    };
  }

  @Get(':id')
  @Roles(AppRole.ADMINISTRATOR)
  @UseGuards(ActiveUserProfileGuard)
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<UserProfileResponseDto> {
    return UserProfileResponseDto.fromEntity(
      await this.usersService.findOne(id),
    );
  }

  @Patch(':id/status')
  @Roles(AppRole.ADMINISTRATOR)
  @UseGuards(ActiveUserProfileGuard)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserProfileStatusDto,
    @CurrentUser() actor: AuthenticatedActor,
  ): Promise<UserProfileResponseDto> {
    return UserProfileResponseDto.fromEntity(
      await this.usersService.updateStatus(id, dto.status, actor.userProfileId),
    );
  }
}
