import { MessageType } from '@prisma/client';
import { IsString, IsOptional, IsArray, IsUUID, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ===== CREATE CONVERSATION =====
export class CreateConversationDto {
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];

  @IsOptional()
  @IsString()
  name?: string; // For group chats
}

// ===== SEND MESSAGE =====
export class SendMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds?: string[]; // Pre-uploaded media IDs
}

// ===== QUERY PARAMS =====
export class GetConversationsQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class GetMessagesQuery {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}

export class SearchMessagesQuery {
  @IsString()
  q: string;

  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

// ===== RESPONSE TYPES =====
export interface ConversationResponse {
  id: string;
  name: string | null;
  isGroup: boolean;
  participants: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
      avatarUrl: string | null;
    };
    lastReadAt: Date | null;
  }[];
  lastMessage: {
    id: string;
    content: string | null;
    type: MessageType;
    senderId: string;
    createdAt: Date;
  } | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
}

export interface ConversationsListResponse {
  conversations: ConversationResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  content: string | null;
  type: MessageType;
  media: {
    id: string;
    url: string;
    type: string;
    duration: number | null;
  }[];
  isEdited: boolean;
  createdAt: Date;
}

export interface MessagesListResponse {
  messages: MessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SharedMediaResponse {
  media: {
    id: string;
    url: string;
    type: string;
    duration: number | null;
    messageId: string;
    createdAt: Date;
  }[];
  nextCursor: string | null;
  hasMore: boolean;
}
