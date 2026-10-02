import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  archiveSchema,
  createCourseSchema,
  createModuleSchema,
  createStepSchema,
  moveStepSchema,
  publishSchema,
  reorderSchema,
  unlockStepSchema,
  updateCourseSchema,
  updateModuleSchema,
  type CreateCourseInput,
  type CreateModuleInput,
  type CreateStepInput,
  type UpdateCourseInput,
  type UpdateModuleInput,
} from '@dacy/shared';
import { ContentService } from './content.service';
import { CourseStudentsService } from './course-students.service';
import { Audit } from '../audit/audit.interceptor';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { forbidden } from '../common/errors';

const listQuery = z.object({
  track: z.string().max(80).optional(),
  q: z.string().trim().max(100).optional(),
  published: z.enum(['true', 'false']).optional(),
  status: z.enum(['published', 'draft', 'archived', 'deleted']).optional(),
});
const confirmQuery = z.object({ confirm: z.string().max(300).optional() });
const forceQuery = z.object({
  force: z.enum(['1', 'true']).optional(),
  confirm: z.string().optional(),
});
const putStepQuery = z.object({ key: z.string().max(80).optional() });

@Staff()
@Controller('admin')
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly students: CourseStudentsService,
  ) {}

  // kurslar
  @Get('courses')
  async list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    if (q.status === 'deleted') await this.content.purgeExpired();
    return this.content.listCourses({
      track: q.track,
      q: q.q,
      status: q.status,
      published: q.published === undefined ? undefined : q.published === 'true',
    });
  }
  @Audit({ action: 'course.create', entity: 'COURSE', target: 'result' })
  @Post('courses')
  create(
    @Body(new ZodPipe(createCourseSchema)) dto: CreateCourseInput,
    @CurrentUser() u: AuthUser,
  ) {
    return this.content.createCourse(dto, u.id);
  }
  @Get('courses/:id')
  tree(@Param('id') id: string) {
    return this.content.getCourseTree(id);
  }
  @Get('courses/:id/stats')
  stats(@Param('id') id: string) {
    return this.content.courseStats(id);
  }
  @Audit({ action: 'course.publish', entity: 'COURSE', body: ['isPublished'] })
  @Patch('courses/:id/publish')
  publishCourse(
    @Param('id') id: string,
    @Body(new ZodPipe(publishSchema)) dto: { isPublished: boolean },
  ) {
    return this.content.publishCourse(id, dto.isPublished);
  }
  @Audit({ action: 'module.reorder', entity: 'COURSE' })
  @Patch('courses/:id/modules/reorder')
  reorderModules(
    @Param('id') id: string,
    @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] },
  ) {
    return this.content.reorderModules(id, dto.ids);
  }
  @Audit({
    action: 'course.update',
    entity: 'COURSE',
    body: ['title', 'slug', 'trackId', 'level', 'instructorName', 'estimatedHours'],
  })
  @Patch('courses/:id')
  update(@Param('id') id: string, @Body(new ZodPipe(updateCourseSchema)) dto: UpdateCourseInput) {
    return this.content.updateCourse(id, dto);
  }

  // ── yalnız ADMIN: arxiv, surət, silmə / bərpa / həmişəlik silmə ──
  @AdminOnly()
  @Audit({ action: 'course.archive', entity: 'COURSE', body: ['archived'] })
  @Patch('courses/:id/archive')
  archive(@Param('id') id: string, @Body(new ZodPipe(archiveSchema)) dto: { archived: boolean }) {
    return this.content.archiveCourse(id, dto.archived);
  }
  @AdminOnly()
  @Audit({ action: 'course.copy', entity: 'COURSE', result: ['id', 'slug'] })
  @Post('courses/:id/copy')
  copy(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.content.copyCourse(id, u);
  }
  @AdminOnly()
  @Audit({ action: 'course.delete', entity: 'COURSE' })
  @Delete('courses/:id')
  remove(
    @Param('id') id: string,
    @Query(new ZodPipe(confirmQuery)) q: z.infer<typeof confirmQuery>,
    @CurrentUser() u: AuthUser,
  ) {
    return this.content.softDeleteCourse(id, q.confirm, u.id);
  }
  @AdminOnly()
  @Audit({ action: 'course.restore', entity: 'COURSE' })
  @Post('courses/:id/restore')
  restore(@Param('id') id: string) {
    return this.content.restoreCourse(id);
  }
  @AdminOnly()
  @Audit({ action: 'course.purge', entity: 'COURSE' })
  @Delete('courses/:id/permanent')
  purge(@Param('id') id: string, @Query(new ZodPipe(confirmQuery)) q: z.infer<typeof confirmQuery>) {
    return this.content.purgeCourse(id, q.confirm);
  }

  // ── yalnız ADMIN: kursun tələbələri ──
  @AdminOnly()
  @Get('courses/:id/students')
  courseStudents(@Param('id') id: string) {
    return this.students.list(id);
  }
  @AdminOnly()
  @Audit({ action: 'enrollment.add', entity: 'COURSE', result: ['email'] })
  @Post('courses/:id/students/:userId')
  enrollStudent(@Param('id') id: string, @Param('userId') userId: string) {
    return this.students.enroll(id, userId);
  }
  @AdminOnly()
  @Audit({ action: 'enrollment.remove', entity: 'COURSE', result: ['email'] })
  @Delete('courses/:id/students/:userId')
  removeStudent(@Param('id') id: string, @Param('userId') userId: string) {
    return this.students.remove(id, userId);
  }
  @AdminOnly()
  @Audit({ action: 'enrollment.reset', entity: 'COURSE', result: ['email'] })
  @Post('courses/:id/students/:userId/reset')
  resetStudent(@Param('id') id: string, @Param('userId') userId: string) {
    return this.students.reset(id, userId);
  }
  @AdminOnly()
  @Audit({ action: 'enrollment.unlock', entity: 'COURSE', result: ['email', 'stepTitle'] })
  @Post('courses/:id/students/:userId/unlock')
  unlockStep(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body(new ZodPipe(unlockStepSchema)) dto: { stepId: string },
    @CurrentUser() u: AuthUser,
  ) {
    return this.students.unlock(id, userId, dto.stepId, u.id);
  }
  @AdminOnly()
  @Audit({ action: 'enrollment.relock', entity: 'COURSE', result: ['email', 'stepTitle'] })
  @Delete('courses/:id/students/:userId/unlock/:stepId')
  relockStep(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('stepId') stepId: string,
  ) {
    return this.students.relock(id, userId, stepId);
  }

  @Audit({ action: 'course.reorder', entity: 'TRACK', target: { param: 'trackId' } })
  @Patch('tracks/:trackId/courses/reorder')
  reorderCourses(
    @Param('trackId') trackId: string,
    @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] },
  ) {
    return this.content.reorderCourses(trackId, dto.ids);
  }

  // fəsillər
  @Audit({ action: 'module.create', entity: 'MODULE', target: 'result' })
  @Post('courses/:id/modules')
  createModule(
    @Param('id') id: string,
    @Body(new ZodPipe(createModuleSchema)) dto: CreateModuleInput,
  ) {
    return this.content.createModule(id, dto);
  }
  @Audit({ action: 'step.reorder', entity: 'MODULE' })
  @Patch('modules/:id/steps/reorder')
  reorderSteps(@Param('id') id: string, @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    return this.content.reorderSteps(id, dto.ids);
  }
  @Audit({ action: 'module.update', entity: 'MODULE', body: ['title', 'key', 'isPublished'] })
  @Patch('modules/:id')
  updateModule(
    @Param('id') id: string,
    @Body(new ZodPipe(updateModuleSchema)) dto: UpdateModuleInput,
  ) {
    return this.content.updateModule(id, dto);
  }
  @Audit({ action: 'module.delete', entity: 'MODULE' })
  @Delete('modules/:id')
  async deleteModule(
    @Param('id') id: string,
    @Query(new ZodPipe(forceQuery)) q: z.infer<typeof forceQuery>,
    @CurrentUser() u: AuthUser,
  ) {
    if (q.force && u.role !== 'ADMIN') throw forbidden();
    return this.content.deleteModule(id, !!q.force);
  }

  // addımlar
  @Audit({ action: 'step.create', entity: 'STEP', target: 'result' })
  @Post('modules/:id/steps')
  createStep(@Param('id') id: string, @Body(new ZodPipe(createStepSchema)) dto: CreateStepInput) {
    return this.content.createStep(id, dto);
  }
  @Get('steps/:id')
  getStep(@Param('id') id: string) {
    return this.content.getStep(id);
  }
  @Audit({ action: 'step.update', entity: 'STEP' })
  @Put('steps/:id')
  putStep(
    @Param('id') id: string,
    @Body() body: unknown,
    @Query(new ZodPipe(putStepQuery)) q: z.infer<typeof putStepQuery>,
  ) {
    return this.content.putStep(id, body, { key: q.key });
  }
  @Audit({ action: 'step.publish', entity: 'STEP', body: ['isPublished'] })
  @Patch('steps/:id/publish')
  publishStep(
    @Param('id') id: string,
    @Body(new ZodPipe(publishSchema)) dto: { isPublished: boolean },
  ) {
    return this.content.publishStep(id, dto.isPublished);
  }
  @Audit({ action: 'step.move', entity: 'STEP', body: ['moduleId', 'index'] })
  @Patch('steps/:id/move')
  moveStep(
    @Param('id') id: string,
    @Body(new ZodPipe(moveStepSchema)) dto: { moduleId: string; index: number },
  ) {
    return this.content.moveStep(id, dto.moduleId, dto.index);
  }
  @Audit({ action: 'step.delete', entity: 'STEP' })
  @Delete('steps/:id')
  async deleteStep(
    @Param('id') id: string,
    @Query(new ZodPipe(forceQuery)) q: z.infer<typeof forceQuery>,
    @CurrentUser() u: AuthUser,
  ) {
    if (q.force && u.role !== 'ADMIN') throw forbidden();
    return this.content.deleteStep(id, !!q.force);
  }
}
