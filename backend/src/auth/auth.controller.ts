import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthMeResponseDto } from './dto/auth-me-response.dto';
import { APP_ROLES } from './enums/app-role.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  @Get('me')
  @Roles(...APP_ROLES)
  getMe(@CurrentUser() user: AuthenticatedUser): AuthMeResponseDto {
    return AuthMeResponseDto.fromUser(user);
  }
}
