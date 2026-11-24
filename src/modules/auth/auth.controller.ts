import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { APP_CONFIG, type AppConfig } from '../../core/config/app-config.js';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe.js';
import { isFirebaseDashboardOrigin } from '../../common/http/dashboard-origin.js';
import { loginInput, type LoginInput } from './auth.dto.js';
import { SessionGuard } from './session.guard.js';
import { directDashboardCookies, requestSession } from './session-cookies.js';
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
    const { session, csrf, email } = await this.auth.login(body, requestSession(request));
    if (isFirebaseDashboardOrigin(request.get('origin'))) {
      const { session: sessionName, csrf: csrfName, options } = directDashboardCookies;
      response.cookie(sessionName, session, { ...options, maxAge: ttl });
      response.cookie(csrfName, csrf, { ...options, maxAge: ttl });
    } else {
      response.cookie('union_session', session, { ...this.cookie, httpOnly: true, maxAge: ttl });
      response.cookie('union_csrf', csrf, { ...this.cookie, maxAge: ttl });
    }
    return { email };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response<unknown, { user: UserIdentity }>,
  ) {
    if (isFirebaseDashboardOrigin(request.get('origin'))) {
      const csrf = request.cookies[directDashboardCookies.csrf];
      if (typeof csrf === 'string' && /^[a-f0-9]{64}$/.test(csrf)) response.setHeader('X-CSRF-Token', csrf);
    }
    return response.locals.user;
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(requestSession(request));
    if (isFirebaseDashboardOrigin(request.get('origin'))) {
      const { session, csrf, options } = directDashboardCookies;
      response.clearCookie(session, options);
      response.clearCookie(csrf, options);
    } else {
      response.clearCookie('union_session', { ...this.cookie, httpOnly: true });
      response.clearCookie('union_csrf', this.cookie);
    }
  }
}
