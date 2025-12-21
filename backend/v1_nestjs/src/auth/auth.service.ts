import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto';
import { User } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
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
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
    });

    return this.generateTokens({ sub: user.id, email: user.email });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens({ sub: user.id, email: user.email });
  }

  async validateUser(payload: TokenPayload) {
    return this.usersService.findById(payload.sub);
  }

  async validateGoogleUser(data: GoogleUserData): Promise<User> {
    // First, try to find user by Google ID
    let user = await this.usersService.findByGoogleId(data.googleId);
    if (user) {
      return user as unknown as User;
    }

    // Check if user with this email exists (account linking)
    user = await this.usersService.findByEmail(data.email);
    if (user) {
      // Link Google account to existing user
      await this.usersService.update(user.id, { googleId: data.googleId });
      return { ...user, googleId: data.googleId } as unknown as User;
    }

    // Create new user with Google credentials
    const newUser = await this.usersService.create({
      email: data.email,
      googleId: data.googleId,
      name: data.name,
      passwordHash: null, // No password for OAuth-only users
    });
    return newUser as unknown as User;
  }

  async loginWithGoogle(user: User): Promise<AuthTokens> {
    return this.generateTokens({ sub: user.id, email: user.email });
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}

