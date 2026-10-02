import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import {
  assessmentSubmitSchema,
  projectSubmitSchema,
  targetPathSchema,
  type ProjectSubmitInput,
} from '@dacy/shared';
import { env } from '../config/env';
import { CurrentUser, OptionalAuth, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest } from '../common/errors';
import { PathsLearnService } from './paths-learn.service';

const previewQuery = z.object({
  preview: z.enum(['1', 'true']).optional(),
  track: z.string().optional(),
});
type PQ = z.infer<typeof previewQuery>;
const isStaff = (u: AuthUser | null) => !!u && (u.role === 'ADMIN' || u.role === 'INSTRUCTOR');
const previewOf = (u: AuthUser | null, q: PQ) => !!q.preview && isStaff(u);
const uploadLimits = { limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 10 } };

function sendFile(res: Response, f: { buffer: Buffer; filename: string }) {
  res.setHeader('content-type', 'application/octet-stream');
  res.setHeader(
    'content-disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
  );
  res.send(f.buffer);
}

@Controller()
export class PathsController {
  constructor(private readonly learn: PathsLearnService) {}

  @OptionalAuth()
  @Get('paths')
  list(@CurrentUser() u: AuthUser | null, @Query(new ZodPipe(previewQuery)) q: PQ) {
    return this.learn.list(u?.id ?? null, q.track);
  }

  @OptionalAuth()
  @Get('paths/by-course/:slug')
  byCourse(@Param('slug') slug: string) {
    return this.learn.byCourse(slug);
  }

  @OptionalAuth()
  @Get('paths/:slug')
  detail(
    @Param('slug') slug: string,
    @CurrentUser() u: AuthUser | null,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.detail(slug, u, previewOf(u, q));
  }

  @Post('paths/:slug/enroll')
  @HttpCode(200)
  enroll(@Param('slug') slug: string, @CurrentUser() u: AuthUser) {
    return this.learn.enroll(u.id, slug);
  }

  @Post('paths/:slug/activate')
  @HttpCode(200)
  activate(@Param('slug') slug: string, @CurrentUser() u: AuthUser) {
    return this.learn.activate(u.id, slug);
  }

  @Get('me/paths')
  mine(@CurrentUser() u: AuthUser) {
    return this.learn.mine(u.id);
  }

  @Get('me/active-path')
  active(@CurrentUser() u: AuthUser) {
    return this.learn.active(u.id);
  }

  @Put('me/target-path')
  setTarget(
    @Body(new ZodPipe(targetPathSchema)) body: { pathSlug: string | null },
    @CurrentUser() u: AuthUser,
  ) {
    return this.learn.setTarget(u.id, body.pathSlug);
  }

  @Get('learn/paths/:slug/items/:key')
  item(
    @Param('slug') slug: string,
    @Param('key') key: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.itemView(u, slug, key, previewOf(u, q));
  }

  @Post('learn/path-items/:id/project')
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor('files', 10, uploadLimits))
  submitProject(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body(new ZodPipe(projectSubmitSchema)) body: ProjectSubmitInput,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.submitProject(
      u,
      id,
      (files ?? []).map((f) => ({ originalname: f.originalname, buffer: f.buffer, size: f.size })),
      body,
      previewOf(u, q),
    );
  }

  @Get('learn/path-items/:id/files/:index')
  async file(
    @Param('id') id: string,
    @Param('index') index: string,
    @CurrentUser() u: AuthUser,
    @Res() res: Response,
  ) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0) throw badRequest('VALIDATION_FAILED');
    sendFile(res, await this.learn.projectFile(u, id, i));
  }

  @Post('learn/path-items/:id/assessment')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  submitAssessment(
    @Param('id') id: string,
    @Body(new ZodPipe(assessmentSubmitSchema)) body: { answers: number[][] },
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.submitAssessment(u, id, body.answers, previewOf(u, q));
  }

  @Post('learn/path-items/:id/milestone')
  @HttpCode(200)
  claim(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(previewQuery)) q: PQ,
  ) {
    return this.learn.claimMilestone(u, id, previewOf(u, q));
  }
}
