import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  CTF_MAX_ATTEMPTS_PER_MINUTE,
  ctfAnswerSchema,
  submissionSchema,
  type SubmissionInput,
} from '@dacy/shared';
import { LearnService } from './learn.service';
import { CurrentUser, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest } from '../common/errors';

const previewQuery = z.object({ preview: z.enum(['1', 'true']).optional() });
const isStaff = (u: AuthUser) => u.role === 'ADMIN' || u.role === 'INSTRUCTOR';
const previewOf = (u: AuthUser, q: { preview?: string }) => !!q.preview && isStaff(u);
type PQ = z.infer<typeof previewQuery>;

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
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.courseMap(u.id, slug, previewOf(u, q));
  }

  @Get('learn/courses/:slug/position/:m/:n')
  position(
    @Param('slug') slug: string,
    @Param('m') m: string,
    @Param('n') n: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
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
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.stepView(u.id, slug, moduleKey, stepKey, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/start')
  start(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.start(u.id, id, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.completeTheory(u.id, id, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/submit')
  submit(
    @Param('id') id: string,
    @Body(new ZodPipe(submissionSchema)) dto: SubmissionInput,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.submit(u.id, id, dto, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/steps/:id/hints/:index')
  hint(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i > 50) throw badRequest('VALIDATION_FAILED');
    return this.learn.hint(u.id, id, i, previewOf(u, q));
  }

  @HttpCode(200)
  @Throttle({ default: { limit: CTF_MAX_ATTEMPTS_PER_MINUTE, ttl: 60_000 } })
  @Post('learn/ctf-tasks/:id/answer')
  ctfAnswer(
    @Param('id') id: string,
    @Body(new ZodPipe(ctfAnswerSchema)) dto: { answer: string },
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.ctfAnswer(u.id, id, dto.answer, previewOf(u, q));
  }

  @HttpCode(200)
  @Post('learn/ctf-tasks/:id/hint')
  ctfHint(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.ctfHint(u.id, id, previewOf(u, q));
  }

  @Get('learn/steps/:id/submissions')
  submissions(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.learn.mySubmissions(u.id, id);
  }
}
