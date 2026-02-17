import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { CommonModule } from '../../common/common.module';
import { PostsService } from './posts.service';

@Module({
  imports: [CommonModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule { }
