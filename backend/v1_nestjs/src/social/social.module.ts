import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { GraphModule } from './graph/graph.module';
import { LikesModule } from './likes/likes.module';
import { CommentsModule } from './comments/comments.module';
import { PostsModule } from './posts/posts.module';
import { FeedModule } from './feed/feed.module';
import { DiscoveryModule } from './discovery/discovery.module';

@Module({
  imports: [CommonModule, GraphModule, LikesModule, CommentsModule, PostsModule, FeedModule, DiscoveryModule],
  controllers: [],
  providers: [],
  exports: [GraphModule, LikesModule, CommentsModule, PostsModule, FeedModule, DiscoveryModule],
})
export class SocialModule { }

