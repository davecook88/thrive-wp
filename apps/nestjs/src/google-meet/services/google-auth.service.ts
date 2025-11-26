import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { EncryptionService } from "./encryption.service.js";
import {
  TeacherGoogleCredential,
  GoogleTokenStatus,
} from "../entities/teacher-google-credential.entity.js";

// Google OAuth configuration
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleOAuthState {
  teacherId: number;
  nonce: string;
  timestamp: number;
}

/**
 * Service handling Google OAuth flow for Calendar API access.
 * Teachers authorize once; tokens are encrypted and stored for API use.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    @InjectRepository(TeacherGoogleCredential)
    private readonly credentialRepo: Repository<TeacherGoogleCredential>,
  ) {
    // Reuse existing Google OAuth credentials from auth module
    this.clientId = this.configService.get<string>("GOOGLE_CLIENT_ID") || "";
    this.clientSecret =
      this.configService.get<string>("GOOGLE_CLIENT_SECRET") || "";
    // Use dedicated redirect URI for calendar OAuth (separate from login OAuth)
    const baseUrl =
      this.configService.get<string>("WP_BASE_URL") || "http://localhost:8080";
    this.redirectUri = `${baseUrl}/api/google/oauth/callback`;
  }

  /**
   * Generate the Google OAuth consent URL for a teacher
   */
  generateAuthUrl(teacherId: number): { authUrl: string; state: string } {
    if (!this.clientId) {
      throw new BadRequestException("Google OAuth not configured");
    }

    const state: GoogleOAuthState = {
      teacherId,
      nonce: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };

    const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent", // Force to get refresh token
      state: stateString,
    });

    return {
      authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state: stateString,
    };
  }

  /**
   * Parse and validate OAuth state parameter
   */
  parseState(stateString: string): GoogleOAuthState {
    try {
      const decoded = Buffer.from(stateString, "base64").toString("utf8");
      const state = JSON.parse(decoded) as GoogleOAuthState;

      // Validate state has required fields
      if (!state.teacherId || !state.nonce || !state.timestamp) {
        throw new Error("Invalid state structure");
      }

      // Check state is not too old (15 minutes max)
      const maxAge = 15 * 60 * 1000;
      if (Date.now() - state.timestamp > maxAge) {
        throw new Error("State expired");
      }

      return state;
    } catch (error) {
      this.logger.warn(
        `Invalid OAuth state: ${error instanceof Error ? error.message : "unknown"}`,
      );
      throw new BadRequestException("Invalid OAuth state");
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    code: string,
    state: string,
  ): Promise<TeacherGoogleCredential> {
    const { teacherId } = this.parseState(state);

    this.logger.log(`Exchanging OAuth code for teacher ${teacherId}`);

    const tokenResponse = await this.fetchTokens(code);

    // Store or update credentials
    const credential = await this.storeCredentials(teacherId, tokenResponse);

    return credential;
  }

  /**
   * Fetch tokens from Google's token endpoint
   */
  private async fetchTokens(code: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.redirectUri,
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Token exchange failed: ${errorText}`);
      throw new BadRequestException("Failed to exchange authorization code");
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  /**
   * Store encrypted credentials in database
   */
  private async storeCredentials(
    teacherId: number,
    tokens: GoogleTokenResponse,
  ): Promise<TeacherGoogleCredential> {
    // Check if credentials already exist
    let credential = await this.credentialRepo.findOne({
      where: { teacherId },
    });

    const accessTokenEnc = this.encryptionService.encrypt(tokens.access_token);
    const refreshTokenEnc = tokens.refresh_token
      ? this.encryptionService.encrypt(tokens.refresh_token)
      : credential?.refreshTokenEnc || "";

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    if (credential) {
      // Update existing
      credential.accessTokenEnc = accessTokenEnc;
      if (tokens.refresh_token) {
        credential.refreshTokenEnc = refreshTokenEnc;
      }
      credential.expiresAt = expiresAt;
      credential.scope = tokens.scope;
      credential.tokenStatus = GoogleTokenStatus.VALID;
    } else {
      // Create new
      credential = this.credentialRepo.create({
        teacherId,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt,
        scope: tokens.scope,
        tokenStatus: GoogleTokenStatus.VALID,
        calendarId: "primary", // Will be updated when we fetch calendar info
      });
    }

    return this.credentialRepo.save(credential);
  }

  /**
   * Get valid credentials for a teacher, refreshing if needed
   */
  async getValidCredentials(
    teacherId: number,
  ): Promise<TeacherGoogleCredential | null> {
    const credential = await this.credentialRepo.findOne({
      where: { teacherId },
    });

    if (!credential) {
      return null;
    }

    if (credential.tokenStatus === GoogleTokenStatus.REVOKED) {
      return null;
    }

    // Check if token needs refresh (within 5 minutes of expiry)
    const refreshThreshold = 5 * 60 * 1000;
    if (
      credential.expiresAt.getTime() - Date.now() < refreshThreshold ||
      credential.tokenStatus === GoogleTokenStatus.EXPIRED
    ) {
      try {
        return await this.refreshToken(credential);
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for teacher ${teacherId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    }

    return credential;
  }

  /**
   * Refresh an expired access token
   */
  async refreshToken(
    credential: TeacherGoogleCredential,
  ): Promise<TeacherGoogleCredential> {
    const refreshToken = this.encryptionService.decrypt(
      credential.refreshTokenEnc,
    );

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `Token refresh failed for teacher ${credential.teacherId}: ${errorText}`,
      );

      // Mark as revoked if refresh fails
      credential.tokenStatus = GoogleTokenStatus.REVOKED;
      await this.credentialRepo.save(credential);

      throw new UnauthorizedException(
        "Google authorization expired. Please reconnect.",
      );
    }

    const tokens = (await response.json()) as GoogleTokenResponse;

    credential.accessTokenEnc = this.encryptionService.encrypt(
      tokens.access_token,
    );
    credential.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    credential.tokenStatus = GoogleTokenStatus.VALID;

    return this.credentialRepo.save(credential);
  }

  /**
   * Get decrypted access token for API calls
   */
  async getAccessToken(teacherId: number): Promise<string | null> {
    const credential = await this.getValidCredentials(teacherId);
    if (!credential) {
      return null;
    }
    return this.encryptionService.decrypt(credential.accessTokenEnc);
  }

  /**
   * Revoke a teacher's Google credentials
   */
  async revokeCredentials(teacherId: number): Promise<void> {
    const credential = await this.credentialRepo.findOne({
      where: { teacherId },
    });

    if (credential) {
      credential.tokenStatus = GoogleTokenStatus.REVOKED;
      await this.credentialRepo.save(credential);
    }
  }

  /**
   * Get Google connection status for a teacher
   */
  async getConnectionStatus(
    teacherId: number,
  ): Promise<{ isConnected: boolean; tokenStatus: GoogleTokenStatus | null }> {
    const credential = await this.credentialRepo.findOne({
      where: { teacherId },
    });

    if (!credential) {
      return { isConnected: false, tokenStatus: null };
    }

    return {
      isConnected: credential.tokenStatus === GoogleTokenStatus.VALID,
      tokenStatus: credential.tokenStatus,
    };
  }

  /**
   * Refresh all credentials expiring soon (for scheduled job)
   */
  async refreshExpiringCredentials(): Promise<number> {
    const threshold = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const expiring = await this.credentialRepo.find({
      where: {
        expiresAt: LessThan(threshold),
        tokenStatus: GoogleTokenStatus.VALID,
      },
    });

    let refreshed = 0;
    for (const credential of expiring) {
      try {
        await this.refreshToken(credential);
        refreshed++;
      } catch {
        this.logger.warn(
          `Failed to refresh credential for teacher ${credential.teacherId}`,
        );
      }
    }

    return refreshed;
  }
}
