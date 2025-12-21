import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup.service';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    UsersModule,
    AuditModule,
  ],
  providers: [CleanupService],
})
export class SchedulerModule { }
