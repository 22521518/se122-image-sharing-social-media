import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthCoreModule } from '../auth-core/auth-core.module';

import { AuditModule } from '../audit/audit.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthCoreModule),
    AuditModule,
    MediaModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
