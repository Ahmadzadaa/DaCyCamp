import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { conflict, unauthorized } from '../common/errors';
import type { AccessPayload } from '../common/guards/auth.guard';
import type { User } from '@prisma/client';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  locale: u.locale,
  xpTotal: u.xpTotal,
  createdAt: u.createdAt.toISOString(),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async hashPassword(p: string) {
    return hash(p);
  }

  async register(dto: RegisterInput, meta: { ua?: string; ip?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw conflict('AUTH_EMAIL_TAKEN', 'Bu e-poçt artıq qeydiyyatdan keçib');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: await hash(dto.password),
        role: 'STUDENT',
      },
    });
    return { user, tokens: await this.issue(user, meta) };
  }

  async login(dto: LoginInput, meta: { ua?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash || !(await verify(user.passwordHash, dto.password))) {
      throw unauthorized('AUTH_INVALID_CREDENTIALS', 'E-poçt və ya şifrə yanlışdır');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return { user, tokens: await this.issue(user, meta) };
  }

  async refresh(raw: string | undefined, meta: { ua?: string; ip?: string }) {
    if (!raw) throw unauthorized('AUTH_REQUIRED');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date())
      throw unauthorized('AUTH_TOKEN_EXPIRED', 'Sessiyanın vaxtı bitib');
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return { user: row.user, tokens: await this.issue(row.user, meta) };
  }

  async logout(raw: string | undefined) {
    if (!raw) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: User, meta: { ua?: string; ip?: string }): Promise<Tokens> {
    const payload: AccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m`,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        userAgent: meta.ua?.slice(0, 300),
        ip: meta.ip?.slice(0, 64),
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400_000),
      },
    });
    return { accessToken, refreshToken };
  }

  setCookies(res: Response, t: Tokens) {
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: env.COOKIE_SECURE, path: '/' };
    res.cookie(COOKIE_ACCESS, t.accessToken, {
      ...base,
      maxAge: env.JWT_ACCESS_TTL_MINUTES * 60_000,
    });
    res.cookie(COOKIE_REFRESH, t.refreshToken, {
      ...base,
      maxAge: env.JWT_REFRESH_TTL_DAYS * 86400_000,
    });
  }

  clearCookies(res: Response) {
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: env.COOKIE_SECURE, path: '/' };
    res.clearCookie(COOKIE_ACCESS, base);
    res.clearCookie(COOKIE_REFRESH, base);
  }
}
