import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  academyAssignmentCreateSchema,
  academyAssignmentUpdateSchema,
  academyExtensionSchema,
  academyRubricSchema,
  academyStepSearchQuery,
  type AcademyAssignmentCreateInput,
  type AcademyAssignmentUpdateInput,
  type AcademyExtensionInput,
  type AcademyRubricInput,
  type AcademyStepSearchQuery,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyAssignmentsService } from './assignments.service';

const publishSchema = z.object({ mode: z.enum(['now', 'scheduled']).default('now') });
const closeSchema = z.object({ reason: z.string().trim().max(500).optional() });
const statusQuery = z.object({ status: z.string().trim().max(30).optional() });

/** Tapşırıq mühərriki (heyət): yaratma, versiyalı redaktə, dərc, uzadılma, rubrika */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyAssignmentsController {
  constructor(private readonly svc: AcademyAssignmentsService) {}

  @Get('steps/search')
  search(@CurrentUser() u: AuthUser, @Query(new ZodPipe(academyStepSearchQuery)) q: AcademyStepSearchQuery) {
    return this.svc.searchSteps(u, q);
  }

  @Get('groups/:id/assignments')
  list(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query(new ZodPipe(statusQuery)) q: { status?: string }) {
    return this.svc.listForGroup(u, id, q.status);
  }

  @Post('groups/:id/assignments')
  create(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyAssignmentCreateSchema)) body: AcademyAssignmentCreateInput,
  ) {
    return this.svc.create(u, id, body);
  }

  @Get('assignments/:id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.getForStaff(u, id);
  }

  @Patch('assignments/:id')
  update(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyAssignmentUpdateSchema)) body: AcademyAssignmentUpdateInput,
  ) {
    return this.svc.update(u, id, body);
  }

  @Delete('assignments/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.deleteDraft(u, id);
  }

  @Post('assignments/:id/publish')
  @HttpCode(200)
  publish(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(publishSchema)) body: { mode: 'now' | 'scheduled' },
  ) {
    return this.svc.publish(u, id, body.mode);
  }

  @Post('assignments/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(closeSchema)) body: { reason?: string }) {
    return this.svc.close(u, id, 'CANCELLED', body.reason);
  }

  @Post('assignments/:id/archive')
  @HttpCode(200)
  archive(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(closeSchema)) body: { reason?: string }) {
    return this.svc.close(u, id, 'ARCHIVED', body.reason);
  }

  @Get('assignments/:id/extensions')
  extensions(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.listExtensions(u, id);
  }

  @Post('assignments/:id/extensions')
  @HttpCode(200)
  extend(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyExtensionSchema)) body: AcademyExtensionInput,
  ) {
    return this.svc.upsertExtension(u, id, body);
  }

  @Delete('assignments/:id/extensions/:studentId')
  removeExtension(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('studentId') studentId: string) {
    return this.svc.deleteExtension(u, id, studentId);
  }

  @Get('assignments/:id/revisions')
  revisions(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.revisions(u, id);
  }

  @Put('assignments/:id/rubric')
  setRubric(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyRubricSchema)) body: AcademyRubricInput,
  ) {
    return this.svc.setRubric(u, id, body);
  }

  @Delete('assignments/:id/rubric')
  deleteRubric(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.deleteRubric(u, id);
  }
}
