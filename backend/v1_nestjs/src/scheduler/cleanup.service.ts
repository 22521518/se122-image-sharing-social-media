import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleHardDelete() {
    this.logger.log('Starting daily hard delete cleanup job...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    for (const user of usersToDelete) {
      try {
        await this.prisma.user.delete({
          where: { id: user.id },
        });

        this.auditService.log(AuditAction.USER_DELETE, user.id, {
          reason: 'HARD_DELETE_SCHEDULE',
          email: user.email,
        });

        this.logger.log(`Hard deleted user ${user.id}`);
      } catch (error) {
        this.logger.error(`Failed to hard delete user ${user.id}: ${error}`);
      }
    }

    this.logger.log(`Cleanup complete. Processed ${usersToDelete.length} users.`);
  }
}
