import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthCoreService, AuthTokens, TokenPayload } from '../auth-core';
import { AdminRole } from './dto';

// Extended user type with role
interface UserWithRole {
  id: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  [key: string]: unknown;
}

/**
 * Auth service for admin/moderators (web-console only)
 * Requires elevated roles for access
 */
@Injectable()
export class AuthAdminService {
  constructor(private readonly authCore: AuthCoreService) { }

  /**
   * Register a new admin/moderator account (dev only)
   */
  async register(email: string, password: string, role: AdminRole): Promise<AuthTokens & { role: UserRole }> {
    const existing = await this.authCore.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.authCore.hashPassword(password);
    const user = await this.authCore.createUser({
      email,
      passwordHash,
      role: role as UserRole,
    });

    const tokens = this.authCore.generateTokens(
      { sub: user.id, email: user.email },
      (user as unknown as { tokenVersion: number }).tokenVersion
    );
    await this.authCore.storeRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, role: role as UserRole };
  }

  async login(email: string, password: string): Promise<AuthTokens & { role: UserRole }> {
    const user = await this.authCore.findUserByEmail(email) as UserWithRole | null;
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has admin or moderator role
    if (user.role !== UserRole.admin && user.role !== UserRole.moderator) {
      throw new ForbiddenException('Admin access required');
    }

    const isMatch = await this.authCore.validatePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.authCore.generateTokens(
      { sub: user.id, email: user.email },
      (user as unknown as { tokenVersion: number }).tokenVersion
    );
    await this.authCore.storeRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, role: user.role };
  }

  async logout(userId: string): Promise<void> {
    await this.authCore.revokeAllSessions(userId);
  }

  async validateUser(payload: TokenPayload) {
    const user = await this.authCore.validateUser(payload) as UserWithRole | null;
    if (!user) return null;

    // Verify admin/mod role
    if (user.role !== UserRole.admin && user.role !== UserRole.moderator) {
      return null;
    }

    return user;
  }
}


