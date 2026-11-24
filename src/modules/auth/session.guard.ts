import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { isReadMethod } from '../../common/http/request-policy.js';
import { AuthService } from './auth.service.js';
import { requestSession } from './session-cookies.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    response.locals.user = await this.auth.authorize(
      requestSession(request),
      request.get('X-CSRF-Token'),
      !isReadMethod(request.method),
    );
    return true;
  }
}
