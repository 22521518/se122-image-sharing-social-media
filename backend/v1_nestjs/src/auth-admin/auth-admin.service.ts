import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthCoreService, AuthTokens, TokenPayload } from '../auth-core';

// Role enum matching Prisma schema
export enum UserRole {
  user = 'user',
  moderator = 'moderator',
  admin = 'admin',
}

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

  async login(email: string, password: string): Promise<AuthTokens & { role: UserRole }> {
    const user = await this.authCore.findUserByEmail(email) as UserWithRole | null;
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has admin or moderator role
    if (![UserRole.admin, UserRole.moderator].includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    const isMatch = await this.authCore.validatePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.authCore.generateTokens({ sub: user.id, email: user.email });
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
    if (![UserRole.admin, UserRole.moderator].includes(user.role)) {
      return null;
    }

    return user;
  }
}


