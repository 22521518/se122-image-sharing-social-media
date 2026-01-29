import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
}

/**
 * NotificationsGateway
 *
 * Handles WebSocket connections for real-time notifications.
 * Validates JWT on connection, maintains user-to-socket mapping,
 * and enables targeted notification delivery.
 *
 * @see Story 9.1: Notification Infrastructure (AC: 1, 3)
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

  // Map of userId -> Set of socket IDs (user can have multiple connections)
  private readonly userSockets = new Map<string, Set<string>>();

  // Map of socket ID -> userId (for fast lookup on disconnect)
  private readonly socketUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Called after the gateway is initialized
   */
  afterInit(server: Server): void {
    this.logger.log('Notifications Gateway initialized with JWT auth');
  }

  /**
   * Called when a client connects
   * AC1: Validates JWT token from handshake and associates socket with user
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.disconnect(true);
        return;
      }

      const payload = await this.verifyToken(token);

      if (!payload) {
        this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
        client.disconnect(true);
        return;
      }

      const userId = payload.sub;

      // Store user-socket mapping
      this.socketUsers.set(client.id, userId);

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room for targeted notifications
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect(true);
    }
  }

  /**
   * Called when a client disconnects
   */
  handleDisconnect(client: Socket): void {
    const userId = this.socketUsers.get(client.id);

    if (userId) {
      // Remove socket from user's set
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);

        // Clean up if no more sockets for this user
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      // Remove socket-to-user mapping
      this.socketUsers.delete(client.id);

      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    } else {
      this.logger.log(`Client disconnected: ${client.id} (unauthenticated)`);
    }
  }

  /**
   * Extract JWT token from socket handshake
   * Supports both auth.token and Authorization header
   */
  private extractToken(client: Socket): string | null {
    // Try auth object first (preferred for socket.io)
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Fallback to Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Verify JWT token and return payload
   */
  private async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      return payload;
    } catch (error) {
      this.logger.debug(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Emit a notification to a specific user via their room
   * AC3: Instant delivery via WebSocket if user is online
   * @param userId The user ID to notify
   * @param event The event name
   * @param payload The notification payload
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    const socketCount = this.userSockets.get(userId)?.size ?? 0;

    if (socketCount > 0) {
      this.server.to(`user:${userId}`).emit(event, payload);
      this.logger.debug(`Emitted ${event} to user ${userId} (${socketCount} sockets)`);
    } else {
      this.logger.debug(`User ${userId} offline, notification stored only`);
    }
  }

  /**
   * Check if a user is currently connected
   * @param userId The user ID to check
   * @returns True if user has at least one active socket connection
   */
  isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  /**
   * Get count of online users (for admin stats)
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
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
