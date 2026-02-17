import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthUserService } from '../auth-user.service';

@Injectable()
export class GoogleUserStrategy extends PassportStrategy(Strategy, 'google-user') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthUserService,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') ||
        `${configService.get<string>('API_URL') || 'http://localhost:3333'}/api/auth/google/callback`,
      scope: ['email', 'profile'],
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email found in Google profile'), undefined);
    }

    try {
      const user = await this.authService.validateGoogleUser({
        googleId: id,
        email,
        name: displayName,
      });
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
