import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config.js';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { loginInput, type LoginInput } from './auth.dto.js';
import { SessionGuard } from './session.guard.js';
import type { UserIdentity } from './identity.js';

const ttl = 8 * 60 * 60 * 1000;

@Controller('api/auth')
export class AuthController {
  private readonly cookie: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.cookie = { path: '/', sameSite: 'strict', secure: config.production };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginInput)) body: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { session, csrf, email } = await this.auth.login(body, request.cookies.union_session);
    response.cookie('union_session', session, { ...this.cookie, httpOnly: true, maxAge: ttl });
    response.cookie('union_csrf', csrf, { ...this.cookie, maxAge: ttl });
    return { email };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Res({ passthrough: true }) response: Response<unknown, { user: UserIdentity }>) {
    return response.locals.user;
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies.union_session);
    response.clearCookie('union_session', { ...this.cookie, httpOnly: true });
    response.clearCookie('union_csrf', this.cookie);
  }
}
