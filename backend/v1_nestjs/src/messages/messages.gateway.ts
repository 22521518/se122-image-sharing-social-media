import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

/**
 * MessagesGateway
 *
 * WebSocket gateway for real-time messaging features:
 * - New message notifications
 * - Typing indicators
 * - Read receipts
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService
  ) { }

  handleConnection(client: AuthenticatedSocket): void {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract userId from handshake auth
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.userId = userId;

      // Track user's socket connections
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user's personal room for direct notifications
      client.join(`user:${userId}`);

      this.logger.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    if (client.userId) {
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
    }
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ): void {
    client.join(`conversation:${conversationId}`);
    this.logger.debug(`Socket ${client.id} joined conversation:${conversationId}`);
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ): void {
    client.leave(`conversation:${conversationId}`);
    this.logger.debug(`Socket ${client.id} left conversation:${conversationId}`);
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): void {
    if (!client.userId) return;

    // Broadcast to other users in the conversation
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Handle read receipt
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ): Promise<void> {
    if (!client.userId) return;

    await this.messagesService.markAsRead(client.userId, conversationId);

    // Notify other participants
    client.to(`conversation:${conversationId}`).emit('messages_read', {
      conversationId,
      userId: client.userId,
      readAt: new Date(),
    });
  }

  /**
   * Emit new message event to all participants in a conversation
   * Called by MessagesService after creating a message
   */
  emitNewMessage(conversationId: string, message: any, participantIds: string[]): void {
    // Emit to conversation room
    this.server.to(`conversation:${conversationId}`).emit('new_message', message);

    // Also emit to each participant's personal room (for notification badges)
    participantIds.forEach(userId => {
      this.server.to(`user:${userId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: message,
      });
    });
  }

  /**
   * Emit messages read event
   */
  emitMessagesRead(conversationId: string, userId: string): void {
    // Notify participants in conversation room
    this.server.to(`conversation:${conversationId}`).emit('messages_read', {
      conversationId,
      userId,
      readAt: new Date(),
    });

    // Also notify the user specifically (for their own list update if not in conversation room)
    this.server.to(`user:${userId}`).emit('messages_read', {
      conversationId,
      userId,
      readAt: new Date(),
    });
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
