import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Header,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import type { Request, Response } from 'express';
import type { ParsedQs } from 'qs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { User } from '../users/entities/user.entity.js';

interface SessionPayload {
  sub: string;
  email: string;
  name: string; // Display name (first + last)
  firstName?: string;
  lastName?: string;
  roles: string[];
  sid: string; // session id
  type: 'access' | 'refresh'; // token type
}

interface RedirectQuery extends ParsedQs {
  redirect?: string | string[] | ParsedQs | ParsedQs[] | undefined;
}

type GoogleStartRequest = Request<
  Record<string, never>,
  unknown,
  unknown,
  RedirectQuery
>;

type GoogleCallbackRequest = Request & { user?: User | undefined };

function normalizeRedirect(value: unknown, baseUrl: string): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let decodedForGuard = trimmed;
  try {
    decodedForGuard = decodeURIComponent(trimmed);
  } catch {
    // keep original form if decoding fails; we'll still validate structure below
  }
  if (/[\r\n]/u.test(decodedForGuard)) return null;

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  let target: URL;
  try {
    target = new URL(trimmed, base);
  } catch {
    return null;
  }

  if (target.origin !== base.origin) return null;

  const search = target.search ?? '';
  const hash = target.hash ?? '';
  const normalized = `${target.pathname}${search}${hash}`;

  if (!normalized.startsWith('/')) return null;
  if (normalized.startsWith('//')) return null;

  return normalized;
}

function readCookieValue(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' ? value : undefined;
}

function signAccessToken(payload: Omit<SessionPayload, 'type'>): string {
  const secret = process.env.SESSION_SECRET || 'dev_insecure_secret_change_me';
  return jwt.sign({ ...payload, type: 'access' }, secret, {
    algorithm: 'HS256',
    expiresIn: '1d',
  });
}

function signRefreshToken(payload: Omit<SessionPayload, 'type'>): string {
  const secret = process.env.SESSION_SECRET || 'dev_insecure_secret_change_me';
  return jwt.sign({ ...payload, type: 'refresh' }, secret, {
    algorithm: 'HS256',
    expiresIn: '28d',
  });
}

function verifySession(token: string): SessionPayload | null {
  try {
    const secret =
      process.env.SESSION_SECRET || 'dev_insecure_secret_change_me';
    return jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as SessionPayload;
  } catch {
    return null;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport will handle the redirect to Google
    // State parameter can be set via session or query param
  }

  // Helper endpoint: set a post-auth redirect and then start the Google OAuth flow.
  // Use this when you want to preserve the page the user was on before auth.
  @Get('google/start')
  startGoogleAuth(@Req() req: GoogleStartRequest, @Res() res: Response) {
    const wpBaseUrl = process.env.WP_BASE_URL || 'http://localhost:8080';
    const redirectRaw = req.query?.redirect;
    console.log('[Google Start] WP_BASE_URL:', wpBaseUrl);
    console.log('[Google Start] redirect query param (raw):', redirectRaw);
    const redirect = normalizeRedirect(redirectRaw, wpBaseUrl);
    console.log('[Google Start] redirect query param:', redirectRaw);

    // Store redirect in session-like cookie that will survive the OAuth roundtrip
    if (redirect) {
      const isProd = process.env.NODE_ENV === 'production';
      // Parse the base URL to get domain for cookie
      const baseUrlObj = new URL(wpBaseUrl);
      const domain = baseUrlObj.hostname;

      console.log(
        '[Google Start] Setting cookie for domain:',
        domain,
        'value:',
        redirect,
      );
      res.cookie('post_auth_redirect', redirect, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        domain: domain === 'localhost' ? undefined : domain, // Don't set domain for localhost
        path: '/',
        maxAge: 1000 * 60 * 10, // 10 minutes to survive OAuth flow
      });
    }
    // Redirect to the passport-protected entry which will redirect to Google
    return res.redirect(302, '/auth/google');
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: GoogleCallbackRequest,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) {
      return res.redirect(302, '/?auth=failed');
    }
    const roles = await this.authService.getUserRoles(user.id);
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      sid: randomUUID(),
      type: 'access',
    };
    const token = signAccessToken(session);
    const refreshToken = signRefreshToken(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const refreshCookieName =
      process.env.REFRESH_COOKIE_NAME || 'thrive_refresh';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1d to match JWT expiry
    });
    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    // Prefer a previously-set post-auth redirect (set by /auth/google/start)
    const redirectCookieName = 'post_auth_redirect';
    const cookieHeader = req.headers.cookie ?? '';
    console.log('[Google Callback] All cookies:', cookieHeader);
    const postAuthRaw =
      readCookieValue(req, redirectCookieName) ??
      extractCookie(cookieHeader, redirectCookieName);
    const postAuthRedirect = normalizeRedirect(postAuthRaw, redirectBase);
    console.log(
      '[Google Callback] postAuthRedirect cookie value:',
      postAuthRedirect,
    );
    if (postAuthRedirect) {
      // clear cookie and only allow path-style redirects for safety
      const wpBaseUrl = process.env.WP_BASE_URL || 'http://localhost:8080';
      const baseUrlObj = new URL(wpBaseUrl);
      const domain = baseUrlObj.hostname;

      res.clearCookie(redirectCookieName, {
        path: '/',
        domain: domain === 'localhost' ? undefined : domain,
      });
      if (postAuthRedirect.startsWith('/')) {
        console.log(
          '[Google Callback] Redirecting to:',
          `${redirectBase}${postAuthRedirect}`,
        );
        return res.redirect(302, `${redirectBase}${postAuthRedirect}`);
      }
    }
    console.log(
      '[Google Callback] No valid redirect found, redirecting to homepage',
    );
    return res.redirect(302, `${redirectBase}/?auth=success`);
  }

  @Get('introspect')
  @Header('Cache-Control', 'no-store')
  @HttpCode(204)
  introspect(@Req() req: Request, @Res() res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const token =
      readCookieValue(req, cookieName) ??
      extractCookie(req.headers.cookie ?? '', cookieName) ??
      null;
    if (!token) return res.sendStatus(401);
    const payload = verifySession(token);
    if (!payload) return res.sendStatus(401);
    // Build single JSON context header for Nginx → WordPress theme hydration
    const context = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      roles: payload.roles,
    };
    // Keep legacy headers for a short transition (can be removed later)
    res.setHeader('X-Auth-User-Id', payload.sub);
    res.setHeader('X-Auth-Email', payload.email);
    res.setHeader('X-Auth-Name', payload.name);
    res.setHeader('X-Auth-Roles', payload.roles.join(','));
    res.setHeader('X-Auth-Context', JSON.stringify(context));
    return res.send();
  }

  @Post('refresh')
  @HttpCode(204)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshCookieName =
      process.env.REFRESH_COOKIE_NAME || 'thrive_refresh';
    const refreshToken =
      readCookieValue(req, refreshCookieName) ??
      extractCookie(req.headers.cookie ?? '', refreshCookieName) ??
      null;

    if (!refreshToken) return res.sendStatus(401);

    const payload = verifySession(refreshToken);
    if (!payload || payload.type !== 'refresh') return res.sendStatus(401);

    // Verify user still exists and has same roles
    const userId = parseInt(payload.sub);
    const roles = await this.authService.getUserRoles(userId);

    // Issue new tokens
    const newSession: SessionPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roles,
      sid: randomUUID(),
      type: 'access',
    };

    const newToken = signAccessToken(newSession);
    const newRefreshToken = signRefreshToken(newSession);

    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie(cookieName, newToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30, // 30m
    });

    res.cookie(refreshCookieName, newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return res.send();
  }

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('redirect') redirect: string | undefined,
    @Res() res: Response,
  ) {
    if (!email || !password)
      throw new BadRequestException('Email & password required');
    const user = await this.authService.registerLocal(
      email,
      password,
      firstName,
      lastName,
    );
    // Issue session cookie same as Google flow
    const roles = await this.authService.getUserRoles(user.id);
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      sid: randomUUID(),
      type: 'access',
    };
    const token = signAccessToken(session);
    const refreshToken = signRefreshToken(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const refreshCookieName =
      process.env.REFRESH_COOKIE_NAME || 'thrive_refresh';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30,
    });
    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    const redirectPath = normalizeRedirect(redirect, redirectBase) ?? '/';
    return res
      .status(201)
      .json({ ok: true, redirect: redirectBase + redirectPath });
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('redirect') redirect: string | undefined,
    @Res() res: Response,
  ) {
    if (!email || !password)
      throw new BadRequestException('Email & password required');
    const user = await this.authService.validateLocal(email, password);
    const roles = await this.authService.getUserRoles(user.id);
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      sid: randomUUID(),
      type: 'access',
    };
    const token = signAccessToken(session);
    const refreshToken = signRefreshToken(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const refreshCookieName =
      process.env.REFRESH_COOKIE_NAME || 'thrive_refresh';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30,
    });
    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    const redirectPath = normalizeRedirect(redirect, redirectBase) ?? '/';
    return res.json({ ok: true, redirect: redirectBase + redirectPath });
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const refreshCookieName =
      process.env.REFRESH_COOKIE_NAME || 'thrive_refresh';
    const isProd = process.env.NODE_ENV === 'production';
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    // Clear both cookies
    res.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
    });
    res.clearCookie(refreshCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
    });
    res.cookie(cookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    res.cookie(refreshCookieName, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    return res.redirect(302, redirectBase + '/?logged_out=1');
  }
}

function extractCookie(header: string, name: string): string | null {
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}
