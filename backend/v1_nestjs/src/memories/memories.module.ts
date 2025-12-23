import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { MediaModule } from '../media/media.module';
import { AuthCoreModule } from '../auth-core/auth-core.module';
import { MemoriesController } from './controllers/memories.controller';
import { MemoriesService } from './services/memories.service';

@Module({
  imports: [CommonModule, MediaModule, AuthCoreModule],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService],
})
export class MemoriesModule { }

