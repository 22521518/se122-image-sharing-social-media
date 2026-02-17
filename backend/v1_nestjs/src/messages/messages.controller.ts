import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Put,
  Req,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth-core/guards/jwt-auth.guard';
import {
  CreateConversationDto,
  SendMessageDto,
  GetConversationsQuery,
  GetMessagesQuery,
  SearchMessagesQuery,
} from './dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  /**
   * Get all conversations for the current user
   */
  @Get('conversations')
  getConversations(
    @Req() req: any,
    @Query() query: GetConversationsQuery,
  ) {
    return this.messagesService.getConversations(req.user.id, query);
  }

  /**
   * Get a specific conversation by ID
   */
  @Get('conversations/:id')
  getConversation(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.messagesService.getConversation(req.user.id, conversationId);
  }

  /**
   * Get or create a direct (1-1) conversation with another user
   */
  @Post('conversations/direct/:userId')
  getOrCreateDirectConversation(
    @Req() req: any,
    @Param('userId', ParseUUIDPipe) otherUserId: string,
  ) {
    return this.messagesService.getOrCreateDirectConversation(req.user.id, otherUserId);
  }

  /**
   * Create a new group conversation
   */
  @Post('conversations/group')
  createGroupConversation(
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createGroupConversation(req.user.id, dto);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:id/messages')
  getMessages(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query() query: GetMessagesQuery,
  ) {
    return this.messagesService.getMessages(req.user.id, conversationId, query);
  }

  /**
   * Send a message to a conversation
   */
  @Post('conversations/:id/messages')
  sendMessage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.id, conversationId, dto);
  }

  /**
   * Mark conversation as read
   */
  @Put('conversations/:id/read')
  markAsRead(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.messagesService.markAsRead(req.user.id, conversationId);
  }

  /**
   * Get shared media in a conversation
   */
  @Get('conversations/:id/media')
  getSharedMedia(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.getSharedMedia(req.user.id, conversationId, cursor, limit);
  }

  /**
   * Search messages
   */
  @Get('search')
  searchMessages(
    @Req() req: any,
    @Query() query: SearchMessagesQuery,
  ) {
    return this.messagesService.searchMessages(req.user.id, query);
  }
}
