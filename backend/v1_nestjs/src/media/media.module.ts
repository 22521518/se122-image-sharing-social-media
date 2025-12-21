import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MediaService } from './services/media.service';

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule { }
