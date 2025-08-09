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
import type { Request, Response } from 'express'; // <-- Add this import
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
}

function signSession(payload: SessionPayload): string {
  const secret = process.env.SESSION_SECRET || 'dev_insecure_secret_change_me';
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '30m' });
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

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const user: any = (req as any).user;
    if (!user) {
      return res.redirect(302, '/?auth=failed');
    }
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [],
      sid: randomUUID(),
    };
    const token = signSession(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30, // 30m
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
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
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [],
      sid: randomUUID(),
    };
    const token = signSession(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30,
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    return res.status(201).json({ ok: true, redirect: redirectBase + '/' });
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
    const session: SessionPayload = {
      sub: String(user.id),
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [],
      sid: randomUUID(),
    };
    const token = signSession(session);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: 1000 * 60 * 30,
    });
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    return res.json({ ok: true, redirect: redirectBase + '/' });
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'thrive_sess';
    const isProd = process.env.NODE_ENV === 'production';
    const redirectBase = process.env.WP_BASE_URL || 'http://localhost:8080';
    // Clear cookie (some browsers are picky – use both clearCookie & explicit expired cookie)
    res.clearCookie(cookieName, {
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
