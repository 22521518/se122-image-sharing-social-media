import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth-core/guards/jwt-auth.guard';
import { PostcardsService } from './postcards.service';
import { PostcardsScheduler } from './postcards.scheduler';
import { CreatePostcardDto } from './dto/create-postcard.dto';

@ApiTags('postcards')
@Controller('postcards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostcardsController {
  constructor(
    private readonly postcardsService: PostcardsService,
    private readonly postcardsScheduler: PostcardsScheduler,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create and send a new postcard' })
  async create(@Request() req: any, @Body() dto: CreatePostcardDto) {
    return this.postcardsService.create(req.user.id, dto);
  }

  @Post('draft')
  @ApiOperation({ summary: 'Save a postcard as draft' })
  async saveDraft(@Request() req: any, @Body() dto: CreatePostcardDto) {
    return this.postcardsService.saveDraft(req.user.id, dto);
  }

  @Get('received')
  @ApiOperation({ summary: 'Get all postcards received by current user' })
  async getReceived(@Request() req: any) {
    return this.postcardsService.getReceivedPostcards(req.user.id);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get all postcards sent by current user' })
  async getSent(@Request() req: any) {
    return this.postcardsService.getSentPostcards(req.user.id);
  }

  @Post('check-geo')
  @ApiOperation({ summary: 'Check and unlock geo-locked postcards near user location' })
  async checkGeoLock(
    @Request() req: any,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const unlocked = await this.postcardsScheduler.checkGeoLockUnlock(
      req.user.id,
      body.latitude,
      body.longitude,
    );
    return {
      unlockedCount: unlocked.length,
      unlocked,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific postcard by ID' })
  async getById(@Request() req: any, @Param('id') id: string) {
    return this.postcardsService.getPostcardById(id, req.user.id);
  }
}

