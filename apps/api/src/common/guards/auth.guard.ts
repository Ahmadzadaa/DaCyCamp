import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { COOKIE_ACCESS } from '@dacy/shared';
import { env } from '../../config/env';
import { unauthorized } from '../errors';
import { IS_OPTIONAL_AUTH, IS_PUBLIC, type AuthUser } from '../decorators';

export interface AccessPayload {
  sub: string;
  email: string;
  role: AuthUser['role'];
  name: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const optional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extract(req);
    if (token) {
      try {
        const p = await this.jwt.verifyAsync<AccessPayload>(token, {
          secret: env.JWT_ACCESS_SECRET,
        });
        req.user = { id: p.sub, email: p.email, role: p.role, name: p.name };
      } catch {
        if (!isPublic && !optional)
          throw unauthorized('AUTH_TOKEN_EXPIRED', 'Sessiyanın vaxtı bitib');
      }
    }
    if (isPublic || optional) return true;
    if (!req.user) throw unauthorized();
    return true;
  }

  private extract(req: Request): string | null {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    if (cookies[COOKIE_ACCESS]) return cookies[COOKIE_ACCESS];
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) return h.slice(7);
    return null;
  }
}
