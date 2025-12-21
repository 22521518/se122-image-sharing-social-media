import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

/**
 * WebsocketModule
 *
 * Provides real-time notification infrastructure for the application.
 * This module handles WebSocket connections for push notifications,
 * postcard unlocking events, and other real-time features.
 *
 * @see Architecture Decision 13 (Real-Time Notifications)
 */
@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class WebsocketModule { }
