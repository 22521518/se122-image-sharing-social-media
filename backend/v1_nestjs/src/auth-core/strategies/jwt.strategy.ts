import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthCoreService, TokenPayload } from '../auth-core.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authCoreService: AuthCoreService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    });
    this.logger.debug(`JWT Strategy initialized with secret: ${configService.get<string>('JWT_SECRET')?.substring(0, 5)}...`);
  }

  async validate(payload: TokenPayload) {
    this.logger.debug(`Validating JWT payload: sub=${payload.sub}, email=${payload.email}`);
    const user = await this.authCoreService.validateUser(payload);
    if (!user) {
      this.logger.warn(`User not found or deleted for sub=${payload.sub}`);
      throw new UnauthorizedException();
    }
    this.logger.debug(`JWT validation successful for user ${user.id}`);
    return user;
  }
}
