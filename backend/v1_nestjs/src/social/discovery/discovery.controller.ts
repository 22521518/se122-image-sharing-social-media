import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth-core/guards/optional-jwt-auth.guard';
import { DiscoveryService } from './discovery.service';
import { SearchQueryDto, SearchResponse, TrendingResponse } from './dto/discovery.dto';

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
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.discoveryService.search(query);
  }

  /**
   * GET /social/explore/trending
   * AC 2, 3: Trending public posts (most liked in last 24h)
   */
  @Get('explore/trending')
  @UseGuards(OptionalJwtAuthGuard) // Optional: auth not required for trending
  async getTrending(): Promise<TrendingResponse> {
    return this.discoveryService.getTrending();
  }
}
