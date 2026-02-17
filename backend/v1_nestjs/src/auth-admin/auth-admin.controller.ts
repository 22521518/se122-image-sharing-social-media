import { Controller, Post, Get, Body, HttpCode, HttpStatus, Res, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth-core/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthAdminService } from './auth-admin.service';
import { LoginDto } from '../auth-core/dto';
import { RegisterAdminDto } from './dto';

/**
 * Auth controller for admin/moderators (web-console only)
 * Uses HTTP-only cookies for refresh tokens (more secure for web)
 */
@ApiTags('Auth - Admin')
@Controller('auth/admin')
export class AuthAdminController {
  constructor(private readonly authService: AuthAdminService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new admin/moderator (dev only)' })
  @ApiResponse({ status: 201, description: 'Successfully registered admin/moderator.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  @ApiBody({ type: RegisterAdminDto })
  async register(@Body() dto: RegisterAdminDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto.email, dto.password, dto.role);

    // Set refresh token as HTTP-only cookie (more secure for web admin)
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      role: result.role,
    };
  }

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate current session and get admin user info' })
  @ApiResponse({ status: 200, description: 'Session valid, returns user info.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - token invalid or expired.' })
  async getMe(@Request() req: Express.Request & { user: { id: string; email: string; role: string } }) {
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    };
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
