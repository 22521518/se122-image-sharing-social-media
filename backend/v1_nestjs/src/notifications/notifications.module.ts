import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthCoreModule } from '../auth-core/auth-core.module';

/**
 * NotificationsModule
 *
 * Provides real-time notification infrastructure for the application.
 * Handles WebSocket connections for push notifications, database persistence,
 * and REST API endpoints for notification management.
 *
 * @see Story 9.1: Notification Infrastructure
 */
@Module({
  imports: [PrismaModule, forwardRef(() => AuthCoreModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule { }
