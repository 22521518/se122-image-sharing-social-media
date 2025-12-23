import { Controller, Post, Delete, Get, Param, UseGuards, Req, Body } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiBody } from '@nestjs/swagger';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('social/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  @Post(':postId')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiParam({ name: 'postId', description: 'ID of the post to comment on' })
  @ApiBody({ type: CreateCommentDto })
  async createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.commentsService.createComment(userId, postId, dto);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete your own comment' })
  @ApiParam({ name: 'commentId', description: 'ID of the comment to delete' })
  async deleteComment(@Param('commentId') commentId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.commentsService.deleteComment(userId, commentId);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get all comments for a post (sorted oldest first)' })
  @ApiParam({ name: 'postId', description: 'ID of the post' })
  async getComments(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    const comments = await this.commentsService.getComments(userId, postId);
    const count = await this.commentsService.getCommentCount(postId);
    return { comments, count };
  }
}
