import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@dacy/shared';
import { forbidden } from '../errors';
import { ROLES_KEY, type AuthUser } from '../decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !roles.includes(user.role)) throw forbidden();
    return true;
  }
}
