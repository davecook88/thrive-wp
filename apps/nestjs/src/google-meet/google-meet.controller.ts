import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { GoogleAuthService } from "./services/google-auth.service.js";
import { MeetingService } from "./services/meeting.service.js";
import { AuthenticatedGuard } from "../auth/authenticated.guard.js";
import { TeacherGuard } from "../auth/teacher.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { User } from "../auth/user.decorator.js";
import type {
  GoogleOAuthInitResponseDto,
  TeacherGoogleStatusDto,
  RetryMeetCreationResponseDto,
  SessionMeetInfoDto,
} from "./dto/google-meet.dto.js";

interface AuthUser {
  id: number;
  email: string;
  roles: string[];
}

/**
 * Controller for Google OAuth and Meet management endpoints.
 * Handles OAuth flow and Meet lifecycle operations.
 */
@Controller("google")
export class GoogleMeetController {
  private readonly logger = new Logger(GoogleMeetController.name);

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly meetingService: MeetingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate Google OAuth flow for a teacher
   * GET /api/google/oauth/start?teacherId=123
   */
  @Get("oauth/start")
  @UseGuards(AuthenticatedGuard, TeacherGuard)
  startOAuth(
    @Query("teacherId", ParseIntPipe) teacherId: number,
    @User() user: AuthUser,
  ): GoogleOAuthInitResponseDto {
    this.logger.log(
      `Starting Google OAuth for teacher ${teacherId} by user ${user.id}`,
    );

    // Verify user has permission (must be the teacher or admin)
    const isAdmin = user.roles.includes("admin");
    if (!isAdmin && user.id !== teacherId) {
      throw new BadRequestException(
        "You can only connect your own Google account",
      );
    }

    return this.googleAuthService.generateAuthUrl(teacherId);
  }

  /**
   * Handle Google OAuth callback
   * GET /api/google/oauth/callback?code=xxx&state=xxx
   */
  @Get("oauth/callback")
  async handleOAuthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const wpBaseUrl =
      this.configService.get<string>("WP_BASE_URL") || "http://localhost:8080";

    if (error) {
      this.logger.warn(`Google OAuth error: ${error}`);
      res.redirect(`${wpBaseUrl}/teacher-dashboard?google_auth=error`);
      return;
    }

    if (!code || !state) {
      this.logger.warn("Missing code or state in OAuth callback");
      res.redirect(`${wpBaseUrl}/teacher-dashboard?google_auth=error`);
      return;
    }

    try {
      await this.googleAuthService.exchangeCode(code, state);
      this.logger.log("Google OAuth successful");
      res.redirect(`${wpBaseUrl}/teacher-dashboard?google_auth=success`);
    } catch (err) {
      this.logger.error(
        `Google OAuth exchange failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
      res.redirect(`${wpBaseUrl}/teacher-dashboard?google_auth=error`);
    }
  }

  /**
   * Get Google connection status for a teacher
   * GET /api/google/status/:teacherId
   */
  @Get("status/:teacherId")
  @UseGuards(AuthenticatedGuard, TeacherGuard)
  async getConnectionStatus(
    @Param("teacherId", ParseIntPipe) teacherId: number,
    @User() user: AuthUser,
  ): Promise<TeacherGoogleStatusDto> {
    // Verify user has permission
    const isAdmin = user.roles.includes("admin");
    if (!isAdmin && user.id !== teacherId) {
      throw new BadRequestException(
        "You can only view your own connection status",
      );
    }

    const status = await this.googleAuthService.getConnectionStatus(teacherId);

    return {
      isConnected: status.isConnected,
      tokenStatus: status.tokenStatus,
    };
  }

  /**
   * Disconnect Google account for a teacher
   * POST /api/google/disconnect/:teacherId
   */
  @Post("disconnect/:teacherId")
  @UseGuards(AuthenticatedGuard, TeacherGuard)
  async disconnect(
    @Param("teacherId", ParseIntPipe) teacherId: number,
    @User() user: AuthUser,
  ): Promise<{ success: boolean }> {
    // Verify user has permission
    const isAdmin = user.roles.includes("admin");
    if (!isAdmin && user.id !== teacherId) {
      throw new BadRequestException(
        "You can only disconnect your own Google account",
      );
    }

    await this.googleAuthService.revokeCredentials(teacherId);

    return { success: true };
  }

  /**
   * Retry Meet creation for a session
   * POST /api/google/meet/retry/:sessionId
   */
  @Post("meet/retry/:sessionId")
  @UseGuards(AuthenticatedGuard, AdminGuard)
  async retryMeetCreation(
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ): Promise<RetryMeetCreationResponseDto> {
    this.logger.log(`Retrying Meet creation for session ${sessionId}`);

    const result = await this.meetingService.retryMeetCreation(sessionId);

    const meetInfo = await this.meetingService.getMeetInfo(sessionId);

    return {
      success: result.success,
      sessionId,
      meetStatus: meetInfo?.meetStatus || "ERROR",
      meetLink: result.meetLink || null,
      message: result.error,
    };
  }

  /**
   * Get Meet info for a session
   * GET /api/google/meet/:sessionId
   */
  @Get("meet/:sessionId")
  @UseGuards(AuthenticatedGuard)
  async getMeetInfo(
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ): Promise<SessionMeetInfoDto | null> {
    return this.meetingService.getMeetInfo(sessionId);
  }
}
