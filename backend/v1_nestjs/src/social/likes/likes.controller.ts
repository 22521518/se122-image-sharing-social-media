import { Controller, Post, Param, UseGuards, Req, Get } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('likes')
@ApiBearerAuth()
@Controller('social/likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) { }

  @Post('toggle/:postId')
  @ApiOperation({ summary: 'Toggle like on a post (like if not liked, unlike if liked)' })
  @ApiParam({ name: 'postId', description: 'ID of the post to toggle like on' })
  async toggleLike(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.likesService.toggleLike(userId, postId);
  }

  @Get('status/:postId')
  @ApiOperation({ summary: 'Check if current user has liked a post' })
  @ApiParam({ name: 'postId', description: 'ID of the post to check' })
  async hasLiked(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    const liked = await this.likesService.hasLiked(userId, postId);
    const likeCount = await this.likesService.getLikeCount(postId);
    return { liked, likeCount };
  }

  @Post('memory/toggle/:memoryId')
  @ApiOperation({ summary: 'Toggle like on a memory' })
  @ApiParam({ name: 'memoryId', description: 'ID of the memory to toggle like on' })
  async toggleLikeMemory(@Param('memoryId') memoryId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.likesService.toggleLikeMemory(userId, memoryId);
  }

  @Get('memory/status/:memoryId')
  @ApiOperation({ summary: 'Check if current user has liked a memory' })
  @ApiParam({ name: 'memoryId', description: 'ID of the memory to check' })
  async hasLikedMemory(@Param('memoryId') memoryId: string, @Req() req: any) {
    const userId = req.user.id;
    const liked = await this.likesService.hasLikedMemory(userId, memoryId);
    const likeCount = await this.likesService.getMemoryLikeCount(memoryId);
    return { liked, likeCount };
  }
}
