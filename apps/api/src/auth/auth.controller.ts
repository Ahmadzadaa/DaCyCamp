import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  COOKIE_REFRESH,
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  type LoginInput,
  type RegisterInput,
} from '@dacy/shared';
import { AuthService, toPublicUser } from './auth.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { CurrentUser, Public, type AuthUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { notFound } from '../common/errors';

const meta = (req: Request) => ({ ua: req.headers['user-agent'], ip: req.ip });
const refreshCookie = (req: Request) =>
  (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_REFRESH];

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body(new ZodPipe(registerSchema)) dto: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(dto, meta(req));
    this.auth.setCookies(res, tokens);
    return toPublicUser(user);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(new ZodPipe(loginSchema)) dto: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto, meta(req));
    this.auth.setCookies(res, tokens);
    return toPublicUser(user);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.refresh(refreshCookie(req), meta(req));
    this.auth.setCookies(res, tokens);
    return toPublicUser(user);
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(refreshCookie(req));
    this.auth.clearCookies(res);
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id: u.id } });
    if (!user) throw notFound();
    return toPublicUser(user);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('password-reset/request')
  requestReset(@Body(new ZodPipe(passwordResetRequestSchema)) dto: { email: string }) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('password-reset/confirm')
  async reset(
    @Body(new ZodPipe(passwordResetSchema)) dto: { token: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.resetPassword(dto.token, dto.password);
    this.auth.clearCookies(res);
    return result;
  }
}
