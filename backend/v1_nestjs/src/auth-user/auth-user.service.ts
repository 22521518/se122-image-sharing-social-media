import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthCoreService, AuthTokens, GoogleUserData, TokenPayload } from '../auth-core';
import { User } from '@prisma/client';

/**
 * Auth service for end-users (cross-platform: mobile + web)
 * Handles both native mobile and Expo web authentication
 */
@Injectable()
export class AuthUserService {
  constructor(private readonly authCore: AuthCoreService) { }

  async register(email: string, password: string): Promise<AuthTokens> {
    const existing = await this.authCore.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.authCore.hashPassword(password);
    const user = await this.authCore.createUser({
      email,
      passwordHash,
    });

    const tokens = this.authCore.generateTokens({ sub: user.id, email: user.email });
    await this.authCore.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.authCore.findUserByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await this.authCore.validatePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reactivation logic for soft-deleted accounts
    if (user.deletedAt) {
      const daysSinceDeleted = Math.floor(
        (Date.now() - new Date(user.deletedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDeleted <= 30) {
        await this.authCore.restoreUser(user.id);
      } else {
        throw new UnauthorizedException('Account has been permanently deleted');
      }
    }

    const tokens = this.authCore.generateTokens({ sub: user.id, email: user.email });
    await this.authCore.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async validateGoogleUser(data: GoogleUserData): Promise<User> {
    let user = await this.authCore.findUserByGoogleId(data.googleId);
    if (user) {
      return user as unknown as User;
    }

    user = await this.authCore.findUserByEmail(data.email);
    if (user) {
      await this.authCore.updateUser(user.id, { googleId: data.googleId });
      return { ...user, googleId: data.googleId } as unknown as User;
    }

    const newUser = await this.authCore.createUser({
      email: data.email,
      googleId: data.googleId,
      name: data.name,
      passwordHash: null,
    });
    return newUser as unknown as User;
  }

  async loginWithGoogle(user: User): Promise<AuthTokens> {
    // Reactivation logic for soft-deleted accounts
    if (user.deletedAt) {
      const daysSinceDeleted = Math.floor(
        (Date.now() - new Date(user.deletedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDeleted <= 30) {
        await this.authCore.restoreUser(user.id);
      } else {
        throw new UnauthorizedException('Account has been permanently deleted');
      }
    }

    const tokens = this.authCore.generateTokens({ sub: user.id, email: user.email });
    await this.authCore.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.authCore.revokeAllSessions(userId);
  }

  async validateUser(payload: TokenPayload) {
    return this.authCore.validateUser(payload);
  }

  async getUserByEmail(email: string) {
    return this.authCore.findUserByEmail(email);
  }
}
