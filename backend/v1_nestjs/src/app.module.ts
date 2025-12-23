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
import { WebsocketModule } from './websocket/websocket.module';
import { MediaModule } from './media/media.module';
import { MemoriesModule } from './memories/memories.module';
import { SocialModule } from './social/social.module';
import { PostcardsModule } from './postcards/postcards.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CommonModule,
    UsersModule,
    AuthCoreModule,
    AuthUserModule,  // End-user auth (cross-platform: mobile + web)
    AuthAdminModule, // Admin/Mod auth (web-console only)
    SchedulerModule,
    WebsocketModule,
    MediaModule,     // Media upload to Cloudinary
    MemoriesModule,  // Voice stickers and memory capture
    SocialModule,    // Social interactions (Feed, Posts, Likes, Comments)
    PostcardsModule, // Time-locked postcards
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

