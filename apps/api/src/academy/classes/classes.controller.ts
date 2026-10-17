import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  academyAttendanceSchema,
  academyScheduleSchema,
  academySessionCreateSchema,
  academySessionUpdateSchema,
  type AcademyAttendanceInput,
  type AcademyScheduleInput,
  type AcademySessionCreateInput,
  type AcademySessionUpdateInput,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyClassesService } from './classes.service';

const rangeQuery = z.object({ from: z.iso.datetime({ offset: true }).optional(), to: z.iso.datetime({ offset: true }).optional() });
type Range = z.infer<typeof rangeQuery>;

/** Dərs cədvəli və davamiyyət */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyClassesController {
  constructor(private readonly svc: AcademyClassesService) {}

  @Get('groups/:id/sessions')
  list(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query(new ZodPipe(rangeQuery)) q: Range) {
    return this.svc.list(u, id, q);
  }

  @Post('groups/:id/sessions')
  create(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(academySessionCreateSchema)) body: AcademySessionCreateInput) {
    return this.svc.create(u, id, body);
  }

  @Post('groups/:id/sessions/series')
  series(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(academyScheduleSchema)) body: AcademyScheduleInput) {
    return this.svc.createSeries(u, id, body);
  }

  @Patch('sessions/:id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(academySessionUpdateSchema)) body: AcademySessionUpdateInput) {
    return this.svc.update(u, id, body);
  }

  @Delete('sessions/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.remove(u, id);
  }

  @Get('sessions/:id/attendance')
  attendance(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.attendance(u, id);
  }

  @Put('sessions/:id/attendance')
  mark(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(academyAttendanceSchema)) body: AcademyAttendanceInput) {
    return this.svc.markAttendance(u, id, body);
  }

  @Get('me/schedule')
  mySchedule(@CurrentUser() u: AuthUser, @Query(new ZodPipe(rangeQuery)) q: Range) {
    return this.svc.mySchedule(u, q);
  }

  @Get('me/attendance')
  myAttendance(@CurrentUser() u: AuthUser) {
    return this.svc.myAttendance(u);
  }
}
