import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { COOKIE_ACCESS } from '@dacy/shared';
import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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
        // Rol və hesab bazadan oxunur: token-dəki rol 15 dəq köhnə qala bilər — rolu dəyişən
        // (məs. seed ilə admin olan) istifadəçi admin səhifəsini görür, API isə 403 qaytarırdı;
        // silinmiş hesabın token-i də dərhal etibarsız olur
        const u = await this.prisma.user.findUnique({
          where: { id: p.sub },
          select: { id: true, email: true, role: true, name: true },
        });
        if (u) req.user = u;
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
