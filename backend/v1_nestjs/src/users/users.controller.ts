import { Controller, Get, Patch, Body, UseGuards, Req, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSettingsDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return the user profile.' })
  async getProfile(@Req() req: Request & { user: User }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      defaultPrivacy: user.defaultPrivacy,
      createdAt: user.createdAt,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  async updateProfile(
    @Req() req: Request & { user: User },
    @Body() dto: UpdateProfileDto,
  ) {
    const updated = await this.usersService.update(req.user.id, dto);
    if (!updated) {
      return null;
    }
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
    };
  }

  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Remove user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar successfully removed.' })
  async removeAvatar(@Req() req: Request & { user: User }) {
    const updated = await this.usersService.update(req.user.id, { avatarUrl: undefined });
    return { message: 'Avatar removed', avatarUrl: updated?.avatarUrl || null };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({ status: 200, description: 'Return user settings.' })
  async getSettings(@Req() req: Request & { user: User }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      return null;
    }
    return {
      defaultPrivacy: user.defaultPrivacy,
      privacySettings: user.privacySettings,
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: 200, description: 'Settings successfully updated.' })
  async updateSettings(
    @Req() req: Request & { user: User },
    @Body() dto: UpdateSettingsDto,
  ) {
    const updated = await this.usersService.update(req.user.id, dto);
    if (!updated) {
      return null;
    }
    return {
      defaultPrivacy: updated.defaultPrivacy,
      privacySettings: updated.privacySettings,
    };
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account scheduled for deletion.' })
  async deleteAccount(@Req() req: Request & { user: User }) {
    await this.usersService.softDelete(req.user.id);
    return {
      message: 'Account scheduled for deletion. You have 30 days to reactivate by logging in.',
    };
  }
}
