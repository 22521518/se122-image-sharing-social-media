import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthCoreModule } from '../auth-core/auth-core.module';
import { MediaModule } from '../media/media.module';
import { MemoriesModule } from '../memories/memories.module';
import { SocialModule } from '../social/social.module';
import { PostcardsModule } from '../postcards/postcards.module';
import { ModerationModule } from '../moderation/moderation.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { AdminAuditLogsController } from './controllers/admin-audit-logs.controller';
import { AdminReportsController } from './controllers/admin-reports.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminAuditLogsService } from './services/admin-audit-logs.service';
import { AdminReportsService } from './services/admin-reports.service';

@Module({
  imports: [
    CommonModule,
    AuthCoreModule,
    MediaModule,
    MemoriesModule,
    SocialModule,
    PostcardsModule,
    ModerationModule,
    PrismaModule,
    NotificationsModule,
  ],
  controllers: [AdminUsersController, AdminStatsController, AdminAuditLogsController, AdminReportsController],
  providers: [AdminUsersService, AdminStatsService, AdminAuditLogsService, AdminReportsService],
  exports: [AdminUsersService, AdminStatsService, AdminAuditLogsService, AdminReportsService],
})
export class AdminModule { }

