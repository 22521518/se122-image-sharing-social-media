/**
 * Messaging Service
 * 
 * API client for real-time messaging features:
 * - Conversations management
 * - Message sending/receiving
 * - Media sharing
 * - Message search
 */

import { ApiService as api } from './api.service';

// ===== TYPES =====

export interface ConversationParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  lastReadAt: string | null;
}

export interface LastMessage {
  id: string;
  content: string | null;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'MIXED' | 'FILE';
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  participants: ConversationParticipant[];
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageMedia {
  id: string;
  url: string;
  type: 'image' | 'audio' | 'video' | 'file';
  mimeType?: string;
  duration: number | null;
  fileName?: string;
  fileSize?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  status?: 'sending' | 'sent' | 'failed';
  senderId: string;
  sender?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  content: string | null;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'MIXED' | 'FILE';
  media: MessageMedia[];
  isEdited: boolean;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SharedMediaItem {
  id: string;
  url: string;
  type: string;
  duration: number | null;
  messageId: string;
  createdAt: string;
}

export interface SharedMediaResponse {
  media: SharedMediaItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendMessageDto {
  content?: string;
  type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'MIXED' | 'FILE';
  mediaIds?: string[];
}

// ===== SERVICE =====

export const messagingService = {
  // ===== CONVERSATIONS =====

  /**
   * Get user's conversations with pagination
   */
  async getConversations(token: string, cursor?: string, limit: number = 20): Promise<ConversationsResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    return api.get<ConversationsResponse>(`/api/messages/conversations?${params.toString()}`, token);
  },

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string, token: string): Promise<Conversation> {
    return api.get<Conversation>(`/api/messages/conversations/${conversationId}`, token);
  },

  /**
   * Get or create a direct (1-1) conversation with another user
   */
  async getOrCreateDirectConversation(otherUserId: string, token: string): Promise<Conversation> {
    return api.post<{}, Conversation>(`/api/messages/conversations/direct/${otherUserId}`, {}, token);
  },

  /**
   * Create a group conversation
   */
  async createGroupConversation(participantIds: string[], name: string | undefined, token: string): Promise<Conversation> {
    return api.post<{ participantIds: string[]; name?: string }, Conversation>(
      '/api/messages/conversations/group',
      { participantIds, name },
      token
    );
  },

  // ===== MESSAGES =====

  /**
   * Get messages in a conversation with cursor-based pagination
   */
  async getMessages(conversationId: string, token: string, cursor?: string, limit: number = 30): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    return api.get<MessagesResponse>(
      `/api/messages/conversations/${conversationId}/messages?${params.toString()}`,
      token
    );
  },

  /**
   * Send a message to a conversation
   */
  async sendMessage(conversationId: string, data: SendMessageDto, token: string): Promise<Message> {
    return api.post<SendMessageDto, Message>(
      `/api/messages/conversations/${conversationId}/messages`,
      data,
      token
    );
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, token: string): Promise<void> {
    return api.put<{}, void>(`/api/messages/conversations/${conversationId}/read`, {}, token);
  },

  // ===== MEDIA =====

  /**
   * Get shared media in a conversation
   */
  async getSharedMedia(conversationId: string, token: string, cursor?: string, limit: number = 20): Promise<SharedMediaResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    return api.get<SharedMediaResponse>(
      `/api/messages/conversations/${conversationId}/media?${params.toString()}`,
      token
    );
  },

  // ===== SEARCH =====

  /**
   * Search messages across all conversations or within a specific one
   */
  async searchMessages(query: string, token: string, conversationId?: string, limit: number = 20): Promise<Message[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (conversationId) params.append('conversationId', conversationId);
    params.append('limit', limit.toString());

    return api.get<Message[]>(`/api/messages/search?${params.toString()}`, token);
  },
};
