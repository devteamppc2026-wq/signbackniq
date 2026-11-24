import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { hasAnyPermission, type Permission, type UserIdentity } from './identity.js';

export const RequireAnyPermission = Reflector.createDecorator<readonly Permission[]>();

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const { user } = context
      .switchToHttp()
      .getResponse<Response<unknown, { user?: UserIdentity }>>().locals;
    const required = this.reflector.getAllAndOverride(RequireAnyPermission, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!user || !required?.length || !hasAnyPermission(user, required)) {
      throw new ForbiddenException('حسابك ملوش صلاحية للعملية دي.');
    }
    return true;
  }
}
