import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express'; // <-- Add this import

@Controller('auth')
export class AuthController {
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const redirectUrl = process.env.WP_BASE_URL
      ? `${process.env.WP_BASE_URL}/?auth=success`
      : 'http://localhost:8080/?auth=success';
    return res.redirect(302, redirectUrl);
  }
}
