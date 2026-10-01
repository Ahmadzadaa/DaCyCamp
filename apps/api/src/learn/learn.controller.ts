import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { quizSubmissionSchema, type QuizSubmissionInput } from '@dacy/shared';
import { LearnService } from './learn.service';
import { CurrentUser, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest } from '../common/errors';

const previewQuery = z.object({ preview: z.enum(['1', 'true']).optional() });
const isStaff = (u: AuthUser) => u.role === 'ADMIN' || u.role === 'INSTRUCTOR';
const previewOf = (u: AuthUser, q: { preview?: string }) => !!q.preview && isStaff(u);

@Controller()
export class LearnController {
  constructor(private readonly learn: LearnService) {}

  @Post('courses/:slug/enroll')
  enroll(@Param('slug') slug: string, @CurrentUser() u: AuthUser) {
    return this.learn.enroll(u.id, slug);
  }

  @Get('me/enrollments')
  mine(@CurrentUser() u: AuthUser) {
    return this.learn.myEnrollments(u.id);
  }

  @Get('learn/courses/:slug')
  map(
    @Param('slug') slug: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
  ) {
    return this.learn.courseMap(u.id, slug, previewOf(u, q));
  }

  @Get('learn/courses/:slug/position/:m/:n')
  position(
    @Param('slug') slug: string,
    @Param('m') m: string,
    @Param('n') n: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
  ) {
    const mi = Number(m);
    const ni = Number(n);
    if (!Number.isInteger(mi) || !Number.isInteger(ni) || mi < 1 || ni < 1)
      throw badRequest('VALIDATION_FAILED');
    return this.learn.resolvePosition(u.id, slug, mi, ni, previewOf(u, q));
  }

  @Get('learn/courses/:slug/steps/:moduleKey/:stepKey')
  step(
    @Param('slug') slug: string,
    @Param('moduleKey') moduleKey: string,
    @Param('stepKey') stepKey: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
  ) {
    return this.learn.stepView(u.id, slug, moduleKey, stepKey, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/start')
  start(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
  ) {
    return this.learn.start(u.id, id, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
  ) {
    return this.learn.completeTheory(u.id, id, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/submit')
  submit(
    @Param('id') id: string,
    @Body(new ZodPipe(quizSubmissionSchema)) dto: QuizSubmissionInput,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: z.infer<typeof previewQuery>,
    @Req() _req: unknown,
  ) {
    return this.learn.submitQuiz(u.id, id, dto.answers, previewOf(u, q));
  }

  @Get('learn/steps/:id/submissions')
  submissions(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.learn.mySubmissions(u.id, id);
  }
}
