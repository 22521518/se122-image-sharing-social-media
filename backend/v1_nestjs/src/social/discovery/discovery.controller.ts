import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth-core/guards/optional-jwt-auth.guard';
import { DiscoveryService } from './discovery.service';
import { SearchQueryDto, SearchResponse, TrendingResponse } from './dto/discovery.dto';

@ApiTags('Social Discovery')
@Controller('social')
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) { }

  /**
   * GET /social/search?q=...&type=all|users|posts|hashtags
   * AC 4, 5: Search for hashtags, users, and posts
   * AC 6: Results filtered to PUBLIC content only
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard) // Optional: auth not required for search
  @ApiOperation({ summary: 'Search for users, posts, and hashtags', description: 'Returns PUBLIC content matching the query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiQuery({ name: 'q', description: 'Search query (min 2 chars)', required: true })
  @ApiQuery({ name: 'type', description: 'Filter type', enum: ['all', 'users', 'posts', 'hashtags'], required: false })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.discoveryService.search(query);
  }

  /**
   * GET /social/explore/trending
   * AC 2, 3: Trending public posts (most liked in last 24h)
   */
  @Get('explore/trending')
  @UseGuards(OptionalJwtAuthGuard) // Optional: auth not required for trending
  @ApiOperation({ summary: 'Get trending posts', description: 'Returns top 50 public posts from last 24h sorted by likes' })
  @ApiResponse({ status: 200, description: 'Trending posts list' })
  async getTrending(): Promise<TrendingResponse> {
    return this.discoveryService.getTrending();
  }
}
