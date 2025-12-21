import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthCoreModule } from '../auth-core/auth-core.module';
import { MediaModule } from '../media/media.module';
import { MemoriesModule } from '../memories/memories.module';
import { SocialModule } from '../social/social.module';
import { PostcardsModule } from '../postcards/postcards.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    CommonModule,
    AuthCoreModule,
    MediaModule,
    MemoriesModule,
    SocialModule,
    PostcardsModule,
    ModerationModule,
  ],
  controllers: [],
  providers: [
    // TODO: Implement Global Admin Guard here or in main.ts
  ],
})
export class AdminModule { }
