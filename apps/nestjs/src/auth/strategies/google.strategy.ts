import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service.js";
import { User } from "@/users/entities/user.entity.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>("google.clientId");
    const clientSecret = configService.get<string>("google.clientSecret");
    if (!clientID || !clientSecret) {
      throw new Error("Google OAuth client ID/secret not configured");
    }
    if (!process.env.GOOGLE_CALLBACK_URL) {
      throw new Error("Google OAuth callback URL not configured");
    }
    super({
      clientID,
      clientSecret,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      passReqToCallback: true,
    });
  }

  // Force account chooser / consent behavior. Google supports prompt values: 'none', 'consent', 'select_account', 'consent select_account'.
  // We default to select_account so users can switch accounts after logging out locally.
  // To change at runtime, set GOOGLE_OAUTH_PROMPT env var (e.g. 'consent select_account').
  public authorizationParams(): Record<string, string> {
    const prompt = process.env.GOOGLE_OAUTH_PROMPT || "select_account";
    return { prompt };
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: User) => void,
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
