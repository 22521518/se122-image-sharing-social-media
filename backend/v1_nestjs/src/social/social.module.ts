import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { GraphModule } from './graph/graph.module';
import { LikesModule } from './likes/likes.module';
import { CommentsModule } from './comments/comments.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [CommonModule, GraphModule, LikesModule, CommentsModule, PostsModule],
  controllers: [],
  providers: [],
  exports: [GraphModule, LikesModule, CommentsModule, PostsModule],
})
export class SocialModule { }

