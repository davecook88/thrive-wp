import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    if (!clientID || !clientSecret) {
      throw new Error('Google OAuth client ID/secret not configured');
    }
    super({
      clientID,
      clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['profile', 'email'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any, info?: any) => void,
  ) {
    try {
      const user = await this.authService.validateGoogleUser({
        id: profile.id,
        emails: profile.emails?.map((e) => ({ value: e.value })),
        name: profile.name,
        displayName: profile.displayName,
      });
      return done(null, user);
    } catch (err) {
      return done(new UnauthorizedException((err as Error).message));
    }
  }
}
