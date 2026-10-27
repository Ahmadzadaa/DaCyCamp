import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { createHash, createHmac, randomBytes } from 'node:crypto';
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
import { conflict, unauthorized, unprocessable } from '../common/errors';
import { MailService } from '../mail/mail.service';
import type { AccessPayload } from '../common/guards/auth.guard';
import type { Prisma, User } from '@prisma/client';

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
  weeklyGoal: u.weeklyGoal,
  showOnLeaderboard: u.showOnLeaderboard,
  createdAt: u.createdAt.toISOString(),
});

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async hashPassword(p: string) {
    return hash(p);
  }

  /**
   * `alsoInTx` — hesabla eyni tranzaksiyada görüləcək iş (məs. akademiya qrupuna qoşulma):
   * o uğursuz olsa hesab da yaranmır.
   */
  async register(
    dto: RegisterInput,
    meta: { ua?: string; ip?: string },
    alsoInTx?: (tx: Prisma.TransactionClient, user: User) => Promise<void>,
  ) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw conflict('AUTH_EMAIL_TAKEN', 'Bu e-poçt artıq qeydiyyatdan keçib');
    const passwordHash = await hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: dto.email, name: dto.name, passwordHash, role: 'STUDENT' },
      });
      if (alsoInTx) await alsoInTx(tx, u);
      return u;
    });
    return { user, tokens: await this.issue(user, meta) };
  }

  async login(dto: LoginInput, meta: { ua?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (
      !user ||
      user.isBlocked ||
      !user.passwordHash ||
      !(await verify(user.passwordHash, dto.password))
    ) {
      throw unauthorized('AUTH_INVALID_CREDENTIALS', 'E-poçt və ya şifrə yanlışdır');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return { user, tokens: await this.issue(user, meta) };
  }

  async refresh(raw: string | undefined, meta: { ua?: string; ip?: string }) {
    if (!raw) throw unauthorized('AUTH_REQUIRED');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(raw) },
      select: { id: true },
    });
    if (!row) throw unauthorized('AUTH_TOKEN_EXPIRED', 'Sessiyanın vaxtı bitib');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "RefreshToken" WHERE id = ${row.id} FOR UPDATE`;
      const current = await tx.refreshToken.findUnique({
        where: { id: row.id },
        include: { user: true },
      });
      const now = new Date();
      if (
        !current ||
        current.user.isBlocked ||
        current.expiresAt <= now ||
        current.authVersion !== current.user.authVersion
      )
        throw unauthorized('AUTH_TOKEN_EXPIRED');
      // Parallel tabs receive the SAME successor during a short retry window. Only hashes are stored.
      const successor = createHmac('sha512', env.JWT_REFRESH_SECRET)
        .update(`refresh:${raw}`)
        .digest('base64url');
      if (current.revokedAt) {
        if (!current.rotatedAt || +now - +current.rotatedAt > 5_000)
          throw unauthorized('AUTH_TOKEN_EXPIRED');
        const next = await tx.refreshToken.findUnique({ where: { tokenHash: sha256(successor) } });
        if (
          !next ||
          next.revokedAt ||
          next.expiresAt <= now ||
          next.authVersion !== current.user.authVersion
        )
          throw unauthorized('AUTH_TOKEN_EXPIRED');
        return {
          user: current.user,
          tokens: { accessToken: await this.accessToken(current.user), refreshToken: successor },
        };
      }
      await tx.refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: now, rotatedAt: now },
      });
      return { user: current.user, tokens: await this.issue(current.user, meta, tx, successor) };
    });
  }

  async logout(raw: string | undefined) {
    if (!raw) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(
    user: User,
    meta: { ua?: string; ip?: string },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
    rawRefresh = randomBytes(48).toString('base64url'),
  ): Promise<Tokens> {
    const accessToken = await this.accessToken(user);
    const refreshToken = rawRefresh;
    await db.refreshToken.create({
      data: {
        userId: user.id,
        authVersion: user.authVersion,
        tokenHash: sha256(refreshToken),
        userAgent: meta.ua?.slice(0, 300),
        ip: meta.ip?.slice(0, 64),
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400_000),
      },
    });
    return { accessToken, refreshToken };
  }

  private accessToken(user: User) {
    const payload: AccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      ver: user.authVersion,
    };
    return this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m`,
    });
  }

  async invalidateSessions(userId: string, password?: string) {
    const passwordHash = password === undefined ? undefined : await hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { authVersion: { increment: 1 }, ...(passwordHash ? { passwordHash } : {}) },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
  }

  async newSession(userId: string, meta: { ua?: string; ip?: string } = {}) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.issue(user, meta);
  }

  async requestPasswordReset(email: string) {
    if (!this.mail.enabled)
      throw unprocessable('MAIL_NOT_CONFIGURED', 'Şifrə bərpası üçün adminlə əlaqə saxlayın.');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.isBlocked) {
      const recent = await this.prisma.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
      });
      if (!recent) {
        const raw = randomBytes(32).toString('hex');
        const token = await this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: sha256(raw),
            expiresAt: new Date(Date.now() + 30 * 60_000),
          },
        });
        const link = new URL('/sifre-yenile', env.NEXT_PUBLIC_APP_URL);
        link.hash = `token=${raw}`;
        try {
          await this.mail.send(
            user.email,
            user.locale === 'en' ? 'Reset your DaCy password' : 'DaCy şifrənizi yeniləyin',
            user.locale === 'en'
              ? `This link expires in 30 minutes and works once:\n\n${link}\n\nIf you did not request it, ignore this email.`
              : `Bu link 30 dəqiqə ərzində bir dəfə istifadə edilə bilər:\n\n${link}\n\nBunu siz istəməmisinizsə, məktubu nəzərə almayın.`,
          );
        } catch {
          await this.prisma.passwordResetToken.update({
            where: { id: token.id },
            data: { usedAt: new Date() },
          });
          // Delivery failures must not reveal whether this email owns an account.
          this.log.warn('Password reset mail delivery failed. Check mail transport configuration.');
        }
      }
    }
    return { accepted: true };
  }

  async resetPassword(raw: string, password: string) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (!token)
      throw unprocessable(
        'PASSWORD_RESET_INVALID',
        'Link etibarsızdır və ya vaxtı bitib. Yeni link istəyin.',
      );
    const passwordHash = await hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${token.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: token.userId } });
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!consumed.count || !user || user.isBlocked)
        throw unprocessable(
          'PASSWORD_RESET_INVALID',
          'Link etibarsızdır və ya vaxtı bitib. Yeni link istəyin.',
        );
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, authVersion: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    return { ok: true };
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
