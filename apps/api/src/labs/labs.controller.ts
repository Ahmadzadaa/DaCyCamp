import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { labStartSchema, type LabStartInput } from '@dacy/shared';
import { LabsService } from './labs.service';
import { CurrentUser, Roles, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';

const previewQuery = z.object({ preview: z.enum(['1', 'true']).optional() });
type PQ = z.infer<typeof previewQuery>;
const isStaff = (u: AuthUser) => u.role === 'ADMIN' || u.role === 'INSTRUCTOR';
const previewOf = (u: AuthUser, q: PQ) => !!q.preview && isStaff(u);

@Controller()
export class LabsController {
  constructor(private readonly labs: LabsService) {}

  @Get('learn/labs/steps/:stepId')
  current(@Param('stepId') stepId: string, @CurrentUser() u: AuthUser) {
    return this.labs.current(u.id, stepId);
  }

  @Post('learn/labs/steps/:stepId/start')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(
    @Param('stepId') stepId: string,
    @Body(new ZodPipe(labStartSchema)) body: LabStartInput,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.labs.start(u.id, stepId, { reset: body.reset, preview: previewOf(u, q) });
  }

  @Post('learn/labs/:id/stop')
  @HttpCode(200)
  stop(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.labs.stop(u.id, id);
  }

  @Post('learn/labs/:id/check')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  check(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.labs.check(u.id, id, previewOf(u, q));
  }

  @Post('learn/labs/:id/ticket')
  @HttpCode(200)
  ticket(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.labs.ticket(u.id, id);
  }

  // ── admin
  @Get('admin/labs')
  @Roles('ADMIN', 'INSTRUCTOR')
  list() {
    return this.labs.listActive();
  }

  @Post('admin/labs/:id/stop')
  @Roles('ADMIN', 'INSTRUCTOR')
  @HttpCode(200)
  adminStop(@Param('id') id: string) {
    return this.labs.adminStop(id);
  }
}
