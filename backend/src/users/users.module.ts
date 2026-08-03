import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserProfile } from './entities/user-profile.entity';
import { ActiveUserProfileGuard } from './guards/active-user-profile.guard';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([UserProfile, AuditLog])],
  controllers: [UsersController],
  providers: [UsersService, ActiveUserProfileGuard],
  exports: [UsersService, ActiveUserProfileGuard],
})
export class UsersModule {}
