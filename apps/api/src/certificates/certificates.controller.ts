import { Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CertificatesService } from './certificates.service';
import { AdminOnly, CurrentUser, Public, type AuthUser } from '../common/decorators';

@Controller()
export class CertificatesController {
  constructor(private readonly certs: CertificatesService) {}

  @Get('me/certificates')
  mine(@CurrentUser() u: AuthUser) {
    return this.certs.mine(u.id);
  }

  /** PDF — ':id' marşrutundan ƏVVƏL olmalıdır, yoxsa Express '<id>.pdf'-i id kimi tutur */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('certificates/:id.pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.certs.pdf(id);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `inline; filename="${filename}"`);
    res.setHeader('cache-control', 'private, max-age=0');
    res.send(buffer);
  }

  /** İctimai yoxlama — giriş tələb etmir (yalnız snapshot məlumatı) */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('certificates/:id')
  get(@Param('id') id: string) {
    return this.certs.getPublic(id);
  }

  @AdminOnly()
  @Post('admin/certificates/:id/revoke')
  @HttpCode(200)
  revoke(@Param('id') id: string) {
    return this.certs.revoke(id);
  }
}
