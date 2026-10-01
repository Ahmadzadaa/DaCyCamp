import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@dacy/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}
export const IS_PUBLIC = 'dacy:public';
export const IS_OPTIONAL_AUTH = 'dacy:optional';
export const ROLES_KEY = 'dacy:roles';

/** Auth tələb etmir */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Cookie varsa istifadəçini oxuyur, yoxdursa anonim buraxır */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Staff = () => Roles('INSTRUCTOR', 'ADMIN');
export const AdminOnly = () => Roles('ADMIN');

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    return ctx.switchToHttp().getRequest().user;
  },
);
