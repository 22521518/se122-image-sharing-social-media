import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth-core/guards/jwt-auth.guard';
import { MediaService } from './services/media.service';
import { Request } from 'express';
import { User } from '@prisma/client';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  // File size limits in bytes
  private static readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_OTHER_SIZE = 25 * 1024 * 1024; // 25MB for audio/video/files

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (image/video/audio)' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'File too large or missing.' })
  async uploadFile(
    @Req() req: Request & { user: User },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Check file size based on type
    const isImage = file.mimetype.startsWith('image/');
    const maxSize = isImage ? MediaController.MAX_IMAGE_SIZE : MediaController.MAX_OTHER_SIZE;
    const maxSizeMB = maxSize / (1024 * 1024);

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size for ${isImage ? 'images' : 'audio/video/files'} is ${maxSizeMB}MB. Your file: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    const media = await this.mediaService.uploadFile(file, req.user.id);

    return {
      id: media.id,
      url: media.url,
      type: media.type,
      size: media.size,
      mimeType: media.mimeType,
      createdAt: media.createdAt,
    };
  }
}
