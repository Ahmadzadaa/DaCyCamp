import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  academyJoinRegisterSchema,
  academyJoinSchema,
  type AcademyJoinInput,
  type AcademyJoinRegisterInput,
} from '@dacy/shared';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AuthService, toPublicUser } from '../../auth/auth.service';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyJoinService } from './join.service';

/** Qoşulma kodu: yoxlama və qeydiyyat açıqdır, ona görə giriş limiti ilə eyni sürət həddi var */
@Controller('academy/join')
@UseGuards(AcademyEnabledGuard)
export class AcademyJoinController {
  constructor(
    private readonly join: AcademyJoinService,
    private readonly auth: AuthService,
  ) {}

  /** Qeydiyyat səhifəsi «Akademiya» seçimini göstərsinmi (modul söndürülübsə guard 404 qaytarır) */
  @Public()
  @Get('status')
  status() {
    return { enabled: true };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('check')
  check(@Body(new ZodPipe(academyJoinSchema)) dto: AcademyJoinInput) {
    return this.join.preview(dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body(new ZodPipe(academyJoinRegisterSchema)) dto: AcademyJoinRegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens, joined } = await this.join.register(dto, {
      ua: req.headers['user-agent'],
      ip: req.ip,
    });
    this.auth.setCookies(res, tokens);
    return { user: toPublicUser(user), joined };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post()
  joinGroup(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(academyJoinSchema)) dto: AcademyJoinInput,
  ) {
    return this.join.join(user, dto.code);
  }
}
