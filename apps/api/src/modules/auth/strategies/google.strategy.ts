import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID     = config.get<string>('google.clientId')     || 'GOOGLE_CLIENT_ID_NOT_SET';
    const clientSecret = config.get<string>('google.clientSecret') || 'GOOGLE_CLIENT_SECRET_NOT_SET';
    const callbackURL  = config.get<string>('google.callbackUrl')  || 'http://localhost:4000/api/v1/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });

    if (clientID === 'GOOGLE_CLIENT_ID_NOT_SET') {
      this.logger.warn(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env to enable Google Sign-In.',
      );
    }
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      // tenant slug passed via state param from frontend
      const tenantSlug = req.query?.state || 'acme';

      const googleUser = {
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || '',
        lastName: profile.name?.familyName || profile.displayName?.split(' ')[1] || '',
        picture: profile.photos?.[0]?.value,
      };

      const user = await this.authService.findOrCreateGoogleUser(googleUser, tenantSlug);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
}
