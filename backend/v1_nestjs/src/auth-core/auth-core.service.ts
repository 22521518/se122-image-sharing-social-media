import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';

export interface TokenPayload {
  sub: string;
  email: string;
  tokenVersion?: number; // For token invalidation on account lock
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleUserData {
  googleId: string;
  email: string;
  name?: string;
}

@Injectable()
export class AuthCoreService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Hash a plain text password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compare plain password with hash
   */
  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Generate access and refresh tokens
   * @param payload Token payload with user ID and email
   * @param tokenVersion Current token version from user record (for invalidation)
   */
  generateTokens(payload: TokenPayload, tokenVersion = 0): AuthTokens {
    const fullPayload = { ...payload, tokenVersion };

    const accessToken = this.jwtService.sign(fullPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(fullPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const hash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.usersService.createRefreshToken({
      userId,
      token: hash,
      expiresAt,
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.usersService.deleteRefreshTokensForUser(userId);
  }

  /**
   * Validate user by token payload
   * Checks for soft-deletion, account lock status, ban status, and token version mismatch
   */
  async validateUser(payload: TokenPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return null; // User not found
    }
    if (user.deletedAt) {
      return null; // Reject soft-deleted users
    }
    if (user.isLocked) {
      return null; // Reject locked accounts (AC 4: immediately logged out)
    }
    // Story 8.3 AC 5: Check ban status - banned users cannot log in
    if (user.isBanned) {
      // Check if temporary ban has expired
      if (user.bannedUntil && new Date() > user.bannedUntil) {
        // Ban has expired, allow login (auto-unban handled separately)
      } else {
        return null; // Reject banned accounts (permanent or still within ban period)
      }
    }
    // Token version mismatch = token was invalidated (e.g., after account lock)
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return null; // Token invalidated
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  /**
   * Find user by Google ID
   */
  async findUserByGoogleId(googleId: string) {
    return this.usersService.findByGoogleId(googleId);
  }

  /**
   * Create new user
   */
  async createUser(data: {
    email: string;
    passwordHash?: string | null;
    googleId?: string;
    name?: string;
    role?: UserRole;
  }) {
    return this.usersService.create(data);
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: { googleId?: string }) {
    return this.usersService.update(userId, data);
  }

  /**
   * Restore soft-deleted user
   */
  async restoreUser(userId: string) {
    return this.usersService.restore(userId);
  }

  /**
   * Get UsersService for advanced operations
   */
  getUsersService() {
    return this.usersService;
  }
}
