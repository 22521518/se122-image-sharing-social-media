import { Controller, Get, Param, UseGuards, Req, Post, Body } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
import { CreatePostDto } from './dto/create-post.dto';

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
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'The post has been successfully created.' })
  async create(@Body() createPostDto: CreatePostDto, @Req() req: any) {
    const userId = req.user.id;
    return this.postsService.createPost({
      ...createPostDto,
      authorId: userId,
    });
  }
}

