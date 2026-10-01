import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  createCourseSchema,
  createModuleSchema,
  createStepSchema,
  moveStepSchema,
  publishSchema,
  reorderSchema,
  updateCourseSchema,
  updateModuleSchema,
  type CreateCourseInput,
  type CreateModuleInput,
  type CreateStepInput,
  type UpdateCourseInput,
  type UpdateModuleInput,
} from '@dacy/shared';
import { ContentService } from './content.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { forbidden } from '../common/errors';

const listQuery = z.object({
  track: z.string().max(80).optional(),
  q: z.string().trim().max(100).optional(),
  published: z.enum(['true', 'false']).optional(),
});
const forceQuery = z.object({
  force: z.enum(['1', 'true']).optional(),
  confirm: z.string().optional(),
});
const putStepQuery = z.object({ key: z.string().max(80).optional() });

@Staff()
@Controller('admin')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // kurslar
  @Get('courses')
  list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.content.listCourses({
      track: q.track,
      q: q.q,
      published: q.published === undefined ? undefined : q.published === 'true',
    });
  }
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
  @Patch('courses/:id/publish')
  publishCourse(
    @Param('id') id: string,
    @Body(new ZodPipe(publishSchema)) dto: { isPublished: boolean },
  ) {
    return this.content.publishCourse(id, dto.isPublished);
  }
  @Patch('courses/:id/modules/reorder')
  reorderModules(
    @Param('id') id: string,
    @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] },
  ) {
    return this.content.reorderModules(id, dto.ids);
  }
  @Patch('courses/:id')
  update(@Param('id') id: string, @Body(new ZodPipe(updateCourseSchema)) dto: UpdateCourseInput) {
    return this.content.updateCourse(id, dto);
  }
  @AdminOnly()
  @Delete('courses/:id')
  remove(@Param('id') id: string, @Query(new ZodPipe(forceQuery)) q: z.infer<typeof forceQuery>) {
    return this.content.deleteCourse(id, q.confirm);
  }
  @Patch('tracks/:trackId/courses/reorder')
  reorderCourses(
    @Param('trackId') trackId: string,
    @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] },
  ) {
    return this.content.reorderCourses(trackId, dto.ids);
  }

  // fəsillər
  @Post('courses/:id/modules')
  createModule(
    @Param('id') id: string,
    @Body(new ZodPipe(createModuleSchema)) dto: CreateModuleInput,
  ) {
    return this.content.createModule(id, dto);
  }
  @Patch('modules/:id/steps/reorder')
  reorderSteps(@Param('id') id: string, @Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    return this.content.reorderSteps(id, dto.ids);
  }
  @Patch('modules/:id')
  updateModule(
    @Param('id') id: string,
    @Body(new ZodPipe(updateModuleSchema)) dto: UpdateModuleInput,
  ) {
    return this.content.updateModule(id, dto);
  }
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
  @Post('modules/:id/steps')
  createStep(@Param('id') id: string, @Body(new ZodPipe(createStepSchema)) dto: CreateStepInput) {
    return this.content.createStep(id, dto);
  }
  @Get('steps/:id')
  getStep(@Param('id') id: string) {
    return this.content.getStep(id);
  }
  @Put('steps/:id')
  putStep(
    @Param('id') id: string,
    @Body() body: unknown,
    @Query(new ZodPipe(putStepQuery)) q: z.infer<typeof putStepQuery>,
  ) {
    return this.content.putStep(id, body, { key: q.key });
  }
  @Patch('steps/:id/publish')
  publishStep(
    @Param('id') id: string,
    @Body(new ZodPipe(publishSchema)) dto: { isPublished: boolean },
  ) {
    return this.content.publishStep(id, dto.isPublished);
  }
  @Patch('steps/:id/move')
  moveStep(
    @Param('id') id: string,
    @Body(new ZodPipe(moveStepSchema)) dto: { moduleId: string; index: number },
  ) {
    return this.content.moveStep(id, dto.moduleId, dto.index);
  }
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
