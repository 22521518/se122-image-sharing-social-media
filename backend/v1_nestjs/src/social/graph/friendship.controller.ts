import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('social/friends')
@UseGuards(JwtAuthGuard)
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) { }

  @Post('request/:userId')
  @ApiOperation({ summary: 'Send a friend request to a user' })
  async sendFriendRequest(@Param('userId') addresseeId: string, @Req() req: any) {
    const requesterId = req.user.id;
    return this.friendshipService.sendFriendRequest(requesterId, addresseeId);
  }

  @Post('accept/:requestId')
  @ApiOperation({ summary: 'Accept a friend request' })
  async acceptFriendRequest(@Param('requestId') requestId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.acceptFriendRequest(requestId, userId);
  }

  @Post('reject/:requestId')
  @ApiOperation({ summary: 'Reject a friend request' })
  async rejectFriendRequest(@Param('requestId') requestId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.rejectFriendRequest(requestId, userId);
  }

  @Post('cancel/:requestId')
  @ApiOperation({ summary: 'Cancel a sent friend request' })
  async cancelFriendRequest(@Param('requestId') requestId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.cancelFriendRequest(requestId, userId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove a friend (unfriend)' })
  async removeFriend(@Param('friendId') friendId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.removeFriend(userId, friendId);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of friends' })
  async getFriends(@Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.getFriends(userId);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Get pending friend requests received' })
  async getPendingRequests(@Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.getPendingRequests(userId);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get friend requests sent by me' })
  async getSentRequests(@Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.getSentRequests(userId);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Get friendship status with a user' })
  async getFriendshipStatus(@Param('userId') targetId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.friendshipService.getFriendshipStatus(userId, targetId);
  }
}
