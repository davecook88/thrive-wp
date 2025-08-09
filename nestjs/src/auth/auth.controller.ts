import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Header,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express'; // <-- Add this import
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
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
    res.setHeader('X-Auth-User-Id', payload.sub);
    res.setHeader('X-Auth-Email', payload.email);
    res.setHeader('X-Auth-Name', payload.name);
    res.setHeader('X-Auth-Roles', payload.roles.join(','));
    return res.send();
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
