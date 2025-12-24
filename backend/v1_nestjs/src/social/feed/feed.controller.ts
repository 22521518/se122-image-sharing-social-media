import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { FeedService } from './feed.service';
import { FeedQueryDto, FeedResponse } from './dto/feed-query.dto';

@Controller('social/feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private feedService: FeedService) { }

  /**
   * GET /social/feed?cursor=...&limit=20
   * AC 3: Retrieves posts from users I follow (plus my own)
   * AC 4: Sorted chronologically with cursor-based pagination
   */
  @Get()
  async getFeed(
    @Request() req: any,
    @Query() query: FeedQueryDto,
  ): Promise<FeedResponse> {
    return this.feedService.getFeed(req.user.id, query);
  }
}
