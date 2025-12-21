import { Controller, Post, Body, Get, UseGuards, Req, Res, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { AuthUserService } from './auth-user.service';
import { RegisterDto, LoginDto } from '../auth-core/dto';
import { User } from '@prisma/client';

/**
 * Auth controller for end-users (cross-platform: mobile + web)
 * Returns tokens in response body - client handles storage based on platform
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthUserController {
  constructor(private readonly authService: AuthUserService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto.email, dto.password);

    // Set Refresh Token as HttpOnly Cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);

    // Set Refresh Token as HttpOnly Cookie
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google-user'))
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 302, description: 'Redirects to Google login.' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google-user'))
  async googleAuthCallback(
    @Req() req: Request & { user: User },
    @Headers('x-platform') platform: string,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.loginWithGoogle(req.user);

    // Determine redirect based on platform header or user-agent
    const isMobile = platform === 'mobile' ||
      req.get('user-agent')?.includes('Expo') ||
      req.query.state === 'mobile';

    const baseUrl = isMobile
      ? process.env.MOBILE_DEEP_LINK_URL || 'lifemapped://auth/callback'
      : process.env.WEB_FRONTEND_URL || 'http://localhost:8081/auth/callback';

    // Always set HttpOnly cookie for Web (and generic support)
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const redirectUrl = isMobile
      ? `${baseUrl}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}` // Mobile needs it in Deep Link
      : `${baseUrl}?accessToken=${tokens.accessToken}`; // Web uses cookie, keep URL clean

    return res.redirect(redirectUrl);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out.' })
  async logout(@Body() body: { userId: string }) {
    await this.authService.logout(body.userId);
    return { message: 'Logged out successfully' };
  }
}
