import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { GraphService } from './graph.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';


@ApiBearerAuth()
@Controller('social/graph')
@UseGuards(JwtAuthGuard)
export class GraphController {
  constructor(private readonly graphService: GraphService) { }

  @Post('follow/:userId')
  async followUser(@Param('userId') followingId: string, @Req() req: any) {
    const followerId = req.user.id;
    return this.graphService.followUser(followerId, followingId);
  }

  @Delete('unfollow/:userId')
  async unfollowUser(@Param('userId') followingId: string, @Req() req: any) {
    const followerId = req.user.id;
    return this.graphService.unfollowUser(followerId, followingId);
  }

  @Get('following')
  async getFollowing(@Req() req: any) {
    const userId = req.user.id;
    return this.graphService.getFollowing(userId);
  }
}
