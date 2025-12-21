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
import { CreateVoiceMemoryDto, CreatePhotoMemoryDto, CreateFeelingPinDto } from '../dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Memories')
@ApiBearerAuth()
@Controller('memories')
@UseGuards(JwtAuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) { }

  @Post('voice')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create voice memory (Voice Sticker)',
    description: 'Upload an audio file with location to create a voice memory pin on the map.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Voice memory upload with audio file and location',
    schema: {
      type: 'object',
      required: ['file', 'latitude', 'longitude'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (AAC, MP3, OGG, WebM, WAV) - max 5MB',
        },
        latitude: {
          type: 'number',
          example: 10.762622,
          description: 'GPS latitude (-90 to 90)',
        },
        longitude: {
          type: 'number',
          example: 106.660172,
          description: 'GPS longitude (-180 to 180)',
        },
        duration: {
          type: 'number',
          example: 3.5,
          description: 'Duration in seconds (1-5)',
        },
        title: {
          type: 'string',
          example: 'Morning thoughts',
          description: 'Optional title/caption',
        },
        privacy: {
          type: 'string',
          enum: ['private', 'friends', 'public'],
          example: 'private',
          description: 'Privacy level',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Voice memory created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid audio format or duration' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @Post('photo')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create photo memory',
    description: 'Upload a photo with location (from EXIF or device) to create a photo memory pin.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Photo memory upload with image file and location',
    schema: {
      type: 'object',
      required: ['file', 'latitude', 'longitude'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, GIF, HEIC) - max 10MB',
        },
        latitude: {
          type: 'number',
          example: 10.762622,
          description: 'GPS latitude from EXIF or device (-90 to 90)',
        },
        longitude: {
          type: 'number',
          example: 106.660172,
          description: 'GPS longitude from EXIF or device (-180 to 180)',
        },
        title: {
          type: 'string',
          example: 'Sunset at the beach',
          description: 'Optional title/caption',
        },
        privacy: {
          type: 'string',
          enum: ['private', 'friends', 'public'],
          example: 'private',
          description: 'Privacy level',
        },
        timestamp: {
          type: 'string',
          example: '2025:12:21 14:30:00',
          description: 'EXIF DateTimeOriginal',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo memory created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max for photos
    },
  }))
  async createPhotoMemory(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreatePhotoMemoryDto,
  ) {
    return this.memoriesService.createPhotoMemory(req.user.id, file, dto);
  }

  @Post('feeling-pin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create feeling-first pin',
    description: 'Create a memory pin with emotional tagging. No photo required - clients render beautiful abstract placeholders based on feeling and time of day. Optionally attach a voice note.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Feeling pin with emotional tag and optional voice file',
    schema: {
      type: 'object',
      required: ['latitude', 'longitude', 'feeling'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Optional audio file (AAC, MP3, OGG, WebM, WAV) - max 5MB',
        },
        latitude: {
          type: 'number',
          example: 10.762622,
          description: 'GPS latitude (-90 to 90)',
        },
        longitude: {
          type: 'number',
          example: 106.660172,
          description: 'GPS longitude (-180 to 180)',
        },
        feeling: {
          type: 'string',
          enum: ['JOY', 'MELANCHOLY', 'ENERGETIC', 'CALM', 'INSPIRED'],
          example: 'JOY',
          description: 'Emotional state when capturing this moment',
        },
        title: {
          type: 'string',
          example: 'A peaceful moment by the river',
          description: 'Optional title/caption',
        },
        privacy: {
          type: 'string',
          enum: ['private', 'friends', 'public'],
          example: 'private',
          description: 'Privacy level',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Feeling pin created with placeholderMetadata for client rendering' })
  @ApiResponse({ status: 400, description: 'Invalid feeling or location' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max for optional audio
    },
  }))
  async createFeelingPin(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateFeelingPinDto,
  ) {
    return this.memoriesService.createFeelingPin(req.user.id, dto, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all memories',
    description: 'Retrieve all memories for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of memories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyMemories(@Request() req: any) {
    return this.memoriesService.getMemoriesByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get memory by ID',
    description: 'Retrieve a specific memory by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Memory UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Memory details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Memory not found' })
  async getMemory(@Request() req: any, @Param('id') id: string) {
    return this.memoriesService.getMemoryById(id, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete memory',
    description: 'Soft delete a memory by its ID. The memory can be restored within 30 days.',
  })
  @ApiParam({ name: 'id', description: 'Memory UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Memory deleted successfully' })
  @ApiResponse({ status: 400, description: 'Memory not found or already deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMemory(@Request() req: any, @Param('id') id: string) {
    return this.memoriesService.deleteMemory(id, req.user.id);
  }
}
