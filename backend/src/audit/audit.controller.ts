import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppRole } from '../auth/enums/app-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ActiveUserProfileGuard } from '../users/guards/active-user-profile.guard';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, ActiveUserProfileGuard, RolesGuard)
@Roles(AppRole.ADMINISTRATOR)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    const result = await this.auditService.findAll(query);
    return {
      ...result,
      items: result.items.map((entry) => AuditLogResponseDto.fromEntity(entry)),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AuditLogResponseDto> {
    return AuditLogResponseDto.fromEntity(await this.auditService.findOne(id));
  }
}
