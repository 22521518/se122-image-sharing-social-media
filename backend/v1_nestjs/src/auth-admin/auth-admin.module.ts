import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthCoreModule } from '../auth-core';
import { AuthAdminController } from './auth-admin.controller';
import { AuthAdminService } from './auth-admin.service';

@Module({
  imports: [
    AuthCoreModule,
    ConfigModule,
  ],
  controllers: [AuthAdminController],
  providers: [AuthAdminService],
  exports: [AuthAdminService],
})
export class AuthAdminModule { }
