import { Injectable, Logger } from '@nestjs/common';

export enum AuditAction {
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_REACTIVATE = 'USER_REACTIVATE',
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  log(action: AuditAction, userId: string, metadata?: any) {
    // In a real system, this would write to an Audit table or external logging service.
    // For MVP, we use structured logging to stdout.
    this.logger.log({
      type: 'AUDIT_LOG',
      action,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }
}
