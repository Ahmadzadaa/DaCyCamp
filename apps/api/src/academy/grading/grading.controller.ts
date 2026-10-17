import { Body, Controller, Get, HttpCode, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  academyGradeSchema,
  academyReturnSchema,
  type AcademyGradeInput,
  type AcademyReturnInput,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyGradingService } from './grading.service';

const releaseSchema = z.object({ expectedVersion: z.number().int().min(0).optional() });

/** Göndərişlərin yoxlanılması, qiymətləndirmə, açıqlama və jurnal (heyət) */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyGradingController {
  constructor(private readonly svc: AcademyGradingService) {}

  @Get('assignments/:id/submissions')
  list(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.listForAssignment(u, id);
  }

  @Post('assignments/:id/grades/release')
  @HttpCode(200)
  releaseAll(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.releaseAll(u, id);
  }

  @Get('submissions/:id')
  detail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.detail(u, id);
  }

  @Put('submissions/:id/grade')
  grade(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyGradeSchema)) body: AcademyGradeInput,
  ) {
    return this.svc.grade(u, id, body);
  }

  @Post('submissions/:id/grade/release')
  @HttpCode(200)
  release(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(releaseSchema)) body: { expectedVersion?: number },
  ) {
    return this.svc.release(u, id, body.expectedVersion);
  }

  @Post('submissions/:id/grade/return')
  @HttpCode(200)
  returnForRevision(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyReturnSchema)) body: AcademyReturnInput,
  ) {
    return this.svc.returnForRevision(u, id, body);
  }

  @Get('groups/:id/gradebook')
  gradebook(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.gradebook(u, id);
  }

  @Get('groups/:id/gradebook/export')
  async exportCsv(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const { filename, csv } = await this.svc.gradebookCsv(u, id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.attachment(filename);
    res.type('text/csv; charset=utf-8');
    res.send(csv);
  }
}
