import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('social/posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Get(':postId')
  @ApiOperation({ summary: 'Get full post details by ID' })
  @ApiParam({ name: 'postId', description: 'ID of the post to retrieve' })
  async getPostById(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.postsService.getPostById(postId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get recent posts (dev feed)' })
  async getRecentPosts(@Req() req: any) {
    const userId = req.user.id;
    return this.postsService.getRecentPosts(userId);
  }
}

