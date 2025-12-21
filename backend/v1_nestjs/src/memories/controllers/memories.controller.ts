import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { MemoriesService } from '../services/memories.service';
import { CreateVoiceMemoryDto } from '../dto';

@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) { }

  /**
   * Create a new voice memory (Voice Sticker)
   * POST /memories/voice
   * 
   * Accepts multipart/form-data with:
   * - file: Audio file (AAC, MP3, OGG, WebM, WAV)
   * - latitude: GPS latitude (-90 to 90)
   * - longitude: GPS longitude (-180 to 180)
   * - duration: Optional duration in seconds (1-5)
   * - title: Optional title/caption
   * - privacy: Optional privacy level (private, friends, public)
   */
  @Post('voice')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max for audio
    },
  }))
  async createVoiceMemory(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateVoiceMemoryDto,
  ) {
    return this.memoriesService.createVoiceMemory(req.user.id, file, dto);
  }

  /**
   * Get all memories for the authenticated user
   * GET /memories
   */
  @Get()
  async getMyMemories(@Request() req: any) {
    return this.memoriesService.getMemoriesByUser(req.user.id);
  }

  /**
   * Get a specific memory by ID
   * GET /memories/:id
   */
  @Get(':id')
  async getMemory(@Request() req: any, @Param('id') id: string) {
    return this.memoriesService.getMemoryById(id, req.user.id);
  }

  /**
   * Delete a memory by ID (soft delete)
   * DELETE /memories/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMemory(@Request() req: any, @Param('id') id: string) {
    return this.memoriesService.deleteMemory(id, req.user.id);
  }
}
