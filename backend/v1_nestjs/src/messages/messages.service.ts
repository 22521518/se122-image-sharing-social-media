import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { MessagesGateway } from './messages.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType, Prisma } from '@prisma/client';
import {
  CreateConversationDto,
  SendMessageDto,
  GetConversationsQuery,
  GetMessagesQuery,
  SearchMessagesQuery,
  ConversationResponse,
  ConversationsListResponse,
  MessageResponse,
  MessagesListResponse,
  SharedMediaResponse,
} from './dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
  ) { }

  /**
   * Get or create a 1-1 conversation between two users
   */
  async getOrCreateDirectConversation(userId: string, otherUserId: string): Promise<ConversationResponse> {
    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: this.getConversationInclude(userId),
    }) as any;

    if (existingConversation) {
      const userMap = await this.fetchParticipantUsers([existingConversation]);
      return this.mapConversationResponse(existingConversation, userId, userMap);
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId },
            { userId: otherUserId },
          ],
        },
      },
      include: this.getConversationInclude(userId),
    }) as any;

    const userMap = await this.fetchParticipantUsers([conversation]);
    return this.mapConversationResponse(conversation, userId, userMap);
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(userId: string, dto: CreateConversationDto): Promise<ConversationResponse> {
    if (dto.participantIds.length < 2) {
      throw new BadRequestException('Group conversation requires at least 2 other participants');
    }

    const allParticipants = [userId, ...dto.participantIds];

    const conversation = await this.prisma.conversation.create({
      data: {
        name: dto.name,
        isGroup: true,
        participants: {
          create: allParticipants.map(id => ({ userId: id })),
        },
      },
      include: this.getConversationInclude(userId),
    }) as any;

    const userMap = await this.fetchParticipantUsers([conversation]);
    return this.mapConversationResponse(conversation, userId, userMap);
  }

  /**
   * Get user's conversations with pagination
   */
  async getConversations(userId: string, query: GetConversationsQuery): Promise<ConversationsListResponse> {
    const limit = query.limit ?? 20;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: this.getConversationInclude(userId),
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
    }) as any;

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, -1) : conversations;

    const userMap = await this.fetchParticipantUsers(items);

    return {
      conversations: items.map(c => this.mapConversationResponse(c, userId, userMap)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Get messages in a conversation with cursor-based pagination
   */
  async getMessages(userId: string, conversationId: string, query: GetMessagesQuery): Promise<MessagesListResponse> {
    // Verify user is participant
    await this.verifyParticipant(userId, conversationId);

    const limit = query.limit ?? 30;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      include: {
        media: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    // Fetch senders info
    const senderIds = [...new Set(items.map(m => m.senderId))];
    const senders = await this.prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map(s => [s.id, s]));

    return {
      messages: items.map(m => this.mapMessageResponse(m, senderMap.get(m.senderId))),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto): Promise<MessageResponse> {
    // Verify user is participant
    await this.verifyParticipant(userId, conversationId);

    if (!dto.content && (!dto.mediaIds || dto.mediaIds.length === 0)) {
      throw new BadRequestException('Message must have content or media');
    }

    // Determine message type
    let messageType = dto.type ?? MessageType.TEXT;

    // Fetch uploaded media records if mediaIds provided
    let mediaRecords: { id: string; url: string; type: string; mimeType: string | null; size: number | null; duration: number | null }[] = [];
    if (dto.mediaIds && dto.mediaIds.length > 0) {
      mediaRecords = await this.prisma.media.findMany({
        where: { id: { in: dto.mediaIds } },
        select: { id: true, url: true, type: true, mimeType: true, size: true, duration: true },
      });

      if (mediaRecords.length === 0) {
        throw new BadRequestException('No valid media found for the provided IDs');
      }

      if (dto.content) {
        messageType = MessageType.MIXED;
      } else if (dto.type && dto.type !== MessageType.TEXT) {
        // Respect explicit type from frontend (IMAGE, AUDIO, FILE)
        messageType = dto.type;
      } else {
        // Auto-detect based on first media type
        const firstMediaType = mediaRecords[0]?.type;
        if (firstMediaType === 'audio') {
          messageType = MessageType.AUDIO;
        } else if (firstMediaType === 'video' || firstMediaType === 'raw') {
          messageType = MessageType.FILE;
        } else {
          messageType = MessageType.IMAGE;
        }
      }
    }

    // Create message with media (create new MessageMedia records from uploaded Media)
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        type: messageType,
        ...(mediaRecords.length > 0 && {
          media: {
            create: mediaRecords.map(m => ({
              url: m.url,
              type: m.type,
              mimeType: m.mimeType,
              size: m.size,
              duration: m.duration,
            })),
          },
        }),
      },
      include: {
        media: true,
      },
    });

    // Update conversation's last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    // Auto mark as read for sender
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    this.messagesGateway.emitMessagesRead(conversationId, userId);

    // Fetch sender info
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    const messageResponse = this.mapMessageResponse(message, sender);

    // Emit real-time event
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    this.messagesGateway.emitNewMessage(
      conversationId,
      messageResponse,
      participants.map(p => p.userId)
    );

    return messageResponse;
  }

  /**
   * Search messages across conversations or within a specific conversation
   */
  async searchMessages(userId: string, query: SearchMessagesQuery): Promise<MessageResponse[]> {
    const limit = query.limit ?? 20;

    // Build where clause
    // Note: SQLite's LIKE is case-insensitive by default for ASCII
    const where: any = {
      deletedAt: null,
      content: {
        contains: query.q,
      },
      conversation: {
        participants: { some: { userId } },
      },
    };

    if (query.conversationId) {
      where.conversationId = query.conversationId;
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        media: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch senders
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senders = await this.prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map(s => [s.id, s]));

    return messages.map(m => this.mapMessageResponse(m, senderMap.get(m.senderId)));
  }

  /**
   * Get shared media in a conversation
   */
  async getSharedMedia(userId: string, conversationId: string, cursor?: string, limit: number = 20): Promise<SharedMediaResponse> {
    await this.verifyParticipant(userId, conversationId);

    const media = await this.prisma.messageMedia.findMany({
      where: {
        message: {
          conversationId,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = media.length > limit;
    const items = hasMore ? media.slice(0, -1) : media;

    return {
      media: items.map(m => ({
        id: m.id,
        url: m.url,
        type: m.type,
        duration: m.duration,
        messageId: m.messageId,
        createdAt: m.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Mark messages as read up to a certain point
   */
  async markAsRead(userId: string, conversationId: string): Promise<void> {
    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(userId: string, conversationId: string): Promise<ConversationResponse> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.getConversationInclude(userId),
    }) as any;

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const userMap = await this.fetchParticipantUsers([conversation]);
    return this.mapConversationResponse(conversation, userId, userMap);
  }

  // ===== PRIVATE HELPERS =====

  private async verifyParticipant(userId: string, conversationId: string): Promise<void> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
  }

  private getConversationInclude(userId: string): any {
    return {
      participants: {
        // No nested include for user to avoid Prisma issues
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          lastReadAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        where: { deletedAt: null },
      },
    };
  }

  private mapConversationResponse(conversation: any, userId: string, userMap?: Map<string, any>): ConversationResponse {
    const userParticipant = conversation.participants.find((p: any) => p.userId === userId);
    const lastMessage = conversation.messages?.[0] || null;

    // Count unread messages
    let unreadCount = 0;
    if (lastMessage) {
      if (!userParticipant?.lastReadAt) {
        // Never read, mark as unread
        unreadCount = 1;
      } else {
        // Check if last message is newer than last read
        unreadCount = new Date(lastMessage.createdAt) > new Date(userParticipant.lastReadAt) ? 1 : 0;
      }
    }

    return {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      participants: conversation.participants.map((p: any) => {
        const user = userMap?.get(p.userId) || { id: p.userId, name: 'User', avatarUrl: null };
        return {
          id: p.id,
          userId: p.userId,
          user: user,
          lastReadAt: p.lastReadAt,
        };
      }),
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        type: lastMessage.type,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
      } : null,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount,
      createdAt: conversation.createdAt,
    };
  }

  private async fetchParticipantUsers(conversations: any[]): Promise<Map<string, any>> {
    const userIds = new Set<string>();
    conversations.forEach(c => {
      c.participants?.forEach((p: any) => userIds.add(p.userId));
      c.messages?.forEach((m: any) => userIds.add(m.senderId));
    });

    if (userIds.size === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, name: true, avatarUrl: true },
    });

    return new Map(users.map(u => [u.id, u]));
  }

  private mapMessageResponse(message: any, sender?: any): MessageResponse {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        avatarUrl: sender.avatarUrl,
      } : undefined,
      content: message.content,
      type: message.type,
      media: message.media?.map((m: any) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        duration: m.duration,
      })) || [],
      isEdited: message.isEdited,
      createdAt: message.createdAt,
    };
  }
}
