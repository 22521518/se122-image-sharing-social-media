import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthAdminService } from './auth-admin.service';
import { LoginDto } from '../auth-core/dto';

/**
 * Auth controller for admin/moderators (web-console only)
 * Uses HTTP-only cookies for refresh tokens (more secure for web)
 */
@ApiTags('Auth - Admin')
@Controller('auth/admin')
export class AuthAdminController {
  constructor(private readonly authService: AuthAdminService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as admin/moderator' })
  @ApiResponse({ status: 200, description: 'Successfully logged in as admin.' })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);

    // Set refresh token as HTTP-only cookie (more secure for web admin)
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      role: result.role,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout admin/moderator' })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  async logout(@Body() body: { userId: string }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(body.userId);
    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully' };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/admin',
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('adminRefreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/admin',
    });
  }
}
