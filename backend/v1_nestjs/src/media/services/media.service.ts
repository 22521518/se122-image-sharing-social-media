import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
const streamifier = require('streamifier');

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly configService: ConfigService) { }

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned no result'));
          }
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    // Extract public_id from URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/filename.jpg
    // Public ID: folder/filename (without extension)
    try {
      const parts = fileUrl.split('/');
      const versionIndex = parts.findIndex(p => p.startsWith('v') && !isNaN(Number(p.substr(1))));
      // If version is found, parts after it are the path. 
      // If not, maybe it's directly after upload/

      // Simpler regex approach:
      // Match everything after '/upload/' (and optional version /v\d+/) until the end
      // Then remove extension
      const matches = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      if (matches && matches[1]) {
        const publicIdWithExt = matches[1];
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

        await cloudinary.uploader.destroy(publicId);
        this.logger.log(`Deleted Cloudinary file: ${publicId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file from Cloudinary: ${fileUrl}`, error);
      // Don't throw, just log
    }
  }
}
