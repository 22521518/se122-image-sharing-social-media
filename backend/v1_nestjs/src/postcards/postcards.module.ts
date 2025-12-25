import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { PostcardsService } from './postcards.service';
import { PostcardsController } from './postcards.controller';
import { PostcardsScheduler } from './postcards.scheduler';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [PostcardsController],
  providers: [PostcardsService, PostcardsScheduler],
  exports: [PostcardsService, PostcardsScheduler],
})
export class PostcardsModule { }
