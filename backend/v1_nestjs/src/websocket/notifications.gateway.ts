import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * NotificationsGateway
 *
 * Handles WebSocket connections for real-time notifications.
 * Used for postcard unlocking, memory share notifications, and other push events.
 *
 * @see Architecture Decision 13 (Real-Time Notifications)
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /**
   * Called after the gateway is initialized
   */
  afterInit(server: Server): void {
    this.logger.log('Notifications Gateway initialized');
  }

  /**
   * Called when a client connects
   * @param client The connected socket client
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    // TODO: Validate JWT token from handshake and associate with user
    // const token = client.handshake.auth?.token;
  }

  /**
   * Called when a client disconnects
   * @param client The disconnected socket client
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit a notification to a specific user
   * @param userId The user ID to notify
   * @param event The event name
   * @param payload The notification payload
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    // TODO: Implement user-to-socket mapping for targeted notifications
    this.logger.debug(`Emitting ${event} to user ${userId}`);
    this.server.emit(event, payload);
  }

  /**
   * Broadcast a notification to all connected clients
   * @param event The event name
   * @param payload The notification payload
   */
  broadcast(event: string, payload: unknown): void {
    this.server.emit(event, payload);
  }
}
