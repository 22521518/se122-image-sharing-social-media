import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuthCoreModule } from './auth-core/auth-core.module';
import { AuthUserModule } from './auth-user/auth-user.module';
import { AuthAdminModule } from './auth-admin/auth-admin.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaModule } from './media/media.module';
import { MemoriesModule } from './memories/memories.module';
import { SocialModule } from './social/social.module';
import { PostcardsModule } from './postcards/postcards.module';
import { ModerationModule } from './moderation/moderation.module';
import { AdminModule } from './admin/admin.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AppModule,
    CommonModule,
    UsersModule,
    AuthCoreModule,
    AuthUserModule,  // End-user auth (cross-platform: mobile + web)
    AuthAdminModule, // Admin/Mod auth (web-console only)
    SchedulerModule,
    NotificationsModule, // Real-time notifications (Epic 9)
    MediaModule,     // Media upload to Cloudinary
    MemoriesModule,  // Voice stickers and memory capture
    SocialModule,    // Social interactions (Feed, Posts, Likes, Comments)
    PostcardsModule, // Time-locked postcards
    ModerationModule, // Content moderation (Epic 7)
    AdminModule,      // Admin console (Epic 8)
    MessagesModule,   // Real-time messaging (Epic 10)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

