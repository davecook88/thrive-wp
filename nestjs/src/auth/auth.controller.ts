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
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

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
  googleAuth() {}

  // Helper endpoint: set a post-auth redirect and then start the Google OAuth flow.
  // Use this when you want to preserve the page the user was on before auth.
  @Get('google/start')
  startGoogleAuth(@Req() req: Request, @Res() res: Response) {
    const redirectCookieName = 'post_auth_redirect';
    const redirect = (req as any).query?.redirect;
    if (redirect && typeof redirect === 'string' && redirect.startsWith('/')) {
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie(redirectCookieName, redirect, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/',
        maxAge: 1000 * 60 * 5, // short lived (5m)
      });
    }
    // Redirect to the passport-protected entry which will redirect to Google
    return res.redirect(302, '/auth/google');
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user: any = (req as any).user;
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
    const postAuthRedirect =
      (req as any).cookies?.[redirectCookieName] ||
      extractCookie(req.headers['cookie'] || '', redirectCookieName) ||
      '';
    if (postAuthRedirect && typeof postAuthRedirect === 'string') {
      // clear cookie and only allow path-style redirects for safety
      res.clearCookie(redirectCookieName, { path: '/' });
      if (postAuthRedirect.startsWith('/')) {
        return res.redirect(302, `${redirectBase}${postAuthRedirect}`);
      }
    }
    return res.redirect(302, `${redirectBase}/?auth=success`);
  }

  @Get('introspect')
  @Header('Cache-Control', 'no-store')
  @HttpCode(204)
  introspect(@Req() req: Request, @Res() res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const token =
      (req as any).cookies?.[cookieName] ||
      extractCookie(req.headers['cookie'] || '', cookieName);
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
      (req as any).cookies?.[refreshCookieName] ||
      extractCookie(req.headers['cookie'] || '', refreshCookieName);

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
    const redirectRaw = (arguments as any)[0]?.redirect as string | undefined;
    const redirectPath =
      redirectRaw && redirectRaw.startsWith('/') ? redirectRaw : '/';
    return res
      .status(201)
      .json({ ok: true, redirect: redirectBase + redirectPath });
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
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
    // Respect optional redirect passed in body (must be a path starting with '/')
    const redirectRaw = (arguments as any)[0]?.redirect as string | undefined;
    const redirectPath =
      redirectRaw && redirectRaw.startsWith('/') ? redirectRaw : '/';
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
