import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByEmailWithDeleted(email: string): Promise<User | null> {
    // Prisma doesn't filter out deleted records by default unless we add logic, 
    // but here we just want to find by email regardless. 
    // However, typical Prisma usage finds all. 
    // If we want checking deletedAt, we might need to check the field.
    // Assuming 'findUnique' returns it even if 'deletedAt' is set, unless we implemented middleware hiding it.
    // For now, raw finding:
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    // Prisma create requires matching the input type. 
    // data is Partial<User>, we need to cast or ensure keys match.
    // We should ideally use Prisma.UserCreateInput.
    // For now casting to any or specific input
    return this.prisma.user.create({
      data: {
        email: data.email!, // Assuming email is required in logic before calling create or data has it
        // We might need to handle other optional fields safely
        passwordHash: data.passwordHash,
        name: data.name,
        avatarUrl: data.avatarUrl,
        googleId: data.googleId,
        defaultPrivacy: data.defaultPrivacy,
        privacySettings: data.privacySettings ?? {},
      } as any, // Using any for partial match transitional safety, but better to be strict
    });
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    return this.prisma.user.update({
      where: { id },
      data: data as any,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<User | null> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // Refresh Token Operations
  async createRefreshToken(data: { userId: string; token: string; expiresAt: Date }): Promise<any> {
    return this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}

