import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Response } from 'express';
import type { UserIdentity } from './identity.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { user } = context
      .switchToHttp()
      .getResponse<Response<unknown, { user?: UserIdentity }>>().locals;
    if (user?.role !== 'admin') throw new ForbiddenException('القسم ده متاح لمدير النظام بس.');
    return true;
  }
}
