import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { ModerationController } from './controllers/moderation.controller';
import { ModerationService } from './services/moderation.service';

@Module({
  imports: [CommonModule],
  controllers: [ReportsController, ModerationController],
  providers: [ReportsService, ModerationService],
  exports: [ReportsService, ModerationService],
})
export class ModerationModule { }
