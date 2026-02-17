import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MediaService } from './services/media.service';
import { MediaController } from './media.controller';

@Module({
  imports: [CommonModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule { }
