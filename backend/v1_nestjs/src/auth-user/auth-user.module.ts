import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthCoreModule, JwtStrategy, JwtAuthGuard } from '../auth-core';
import { AuthUserController } from './auth-user.controller';
import { AuthUserService } from './auth-user.service';
import { GoogleUserStrategy } from './strategies/google-user.strategy';

@Module({
  imports: [
    AuthCoreModule,
    PassportModule,
    ConfigModule,
  ],
  controllers: [AuthUserController],
  providers: [AuthUserService, GoogleUserStrategy, JwtStrategy, JwtAuthGuard],
  exports: [AuthUserService, JwtAuthGuard],
})
export class AuthUserModule { }

