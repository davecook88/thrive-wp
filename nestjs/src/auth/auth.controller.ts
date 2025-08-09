import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: any) {
    const redirectUrl = process.env.WP_BASE_URL
      ? `${process.env.WP_BASE_URL}/?auth=success`
      : 'http://localhost:8080/?auth=success';
    return res.redirect(302, redirectUrl);
  }
}
