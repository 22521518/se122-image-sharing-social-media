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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (image/video/audio)' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully.' })
  async uploadFile(
    @Req() req: Request & { user: User },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
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
