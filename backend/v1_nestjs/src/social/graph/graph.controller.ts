import { Controller, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { GraphService } from './graph.service';
// Assuming JwtAuthGuard exists. If not, I'll need to find it. 
// Usually in src/auth-core/guards/jwt-auth.guard.ts or similar.
// I'll assume standard 'JwtAuthGuard' for now, but I might need to correct import.
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
}
