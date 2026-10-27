import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import {
  classroomAnnouncementSchema,
  classroomAnnouncementUpdateSchema,
  classroomArchiveSchema,
  classroomLessonSchema,
  classroomLessonUpdateSchema,
  classroomTopicSchema,
  classroomPageSchema,
  classroomQuestionSchema,
  classroomReplySchema,
  type ClassroomAnnouncementInput,
  type ClassroomAnnouncementUpdateInput,
  type ClassroomLessonInput,
  type ClassroomLessonUpdateInput,
  type ClassroomQuestionInput,
  type ClassroomTopicInput,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { badRequest } from '../../common/errors';
import { env } from '../../config/env';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { ClassroomService } from './classroom.service';

const archivedSchema = z.object({ archived: z.boolean() });
const resolvedSchema = z.object({ resolved: z.boolean() });
const restoreSchema = z.object({
  revisionId: z.string().min(1).max(64),
  expectedVersion: z.number().int().min(1),
});
const questionQuery = classroomPageSchema.extend({
  assignmentId: z.string().min(1).max(100).optional(),
});
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class ClassroomController {
  constructor(private readonly svc: ClassroomService) {}

  @Get('groups/:id/classroom')
  classroom(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(classroomPageSchema)) q: { page: number },
  ) {
    return this.svc.classroom(u, id, q.page);
  }
  @Get('instructor/desk')
  desk(@CurrentUser() u: AuthUser) {
    return this.svc.teacherDesk(u);
  }

  @Post('groups/:id/classroom/topics')
  topic(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomTopicSchema)) data: ClassroomTopicInput,
  ) {
    return this.svc.topic(u, id, data);
  }
  @Patch('groups/:id/classroom/topics/:topicId')
  updateTopic(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body(new ZodPipe(classroomTopicSchema)) data: ClassroomTopicInput,
  ) {
    return this.svc.topic(u, id, data, topicId);
  }
  @Post('classroom/topics/:id/archive')
  archiveTopic(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(archivedSchema)) data: { archived: boolean },
  ) {
    return this.svc.archiveTopic(u, id, data.archived);
  }
  @Post('groups/:id/classroom/lessons')
  lesson(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomLessonSchema)) data: ClassroomLessonInput,
  ) {
    return this.svc.createLesson(u, id, data);
  }
  @Get('classroom/lessons/:id')
  getLesson(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.lesson(u, id);
  }
  @Patch('classroom/lessons/:id')
  updateLesson(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomLessonUpdateSchema)) data: ClassroomLessonUpdateInput,
  ) {
    return this.svc.updateLesson(u, id, data);
  }
  @Post('classroom/lessons/:id/archive')
  archiveLesson(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomArchiveSchema)) data: { archived: boolean; expectedVersion: number },
  ) {
    return this.svc.archive(u, 'lesson', id, data.archived, data.expectedVersion);
  }
  @Get('classroom/lessons/:id/history')
  lessonHistory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(classroomPageSchema)) q: { page: number },
  ) {
    return this.svc.history(u, 'lesson', id, q.page);
  }
  @Post('classroom/lessons/:id/restore')
  restoreLesson(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(restoreSchema)) data: { revisionId: string; expectedVersion: number },
  ) {
    return this.svc.restoreRevision(u, 'lesson', id, data.revisionId, data.expectedVersion);
  }
  @Post('classroom/lessons/:id/steps/:stepId/open')
  openStep(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('stepId') stepId: string) {
    return this.svc.openStep(u, id, stepId);
  }

  @Get('groups/:id/classroom/announcements')
  announcements(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(classroomPageSchema)) q: { page: number },
  ) {
    return this.svc.announcements(u, id, q.page);
  }
  @Post('groups/:id/classroom/announcements')
  announcement(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomAnnouncementSchema)) data: ClassroomAnnouncementInput,
  ) {
    return this.svc.saveAnnouncement(u, id, data);
  }
  @Patch('classroom/announcements/:id')
  updateAnnouncement(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomAnnouncementUpdateSchema)) data: ClassroomAnnouncementUpdateInput,
  ) {
    return this.svc.updateAnnouncement(u, id, data);
  }
  @Post('classroom/announcements/:id/archive')
  archiveAnnouncement(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomArchiveSchema)) data: { archived: boolean; expectedVersion: number },
  ) {
    return this.svc.archive(u, 'announcement', id, data.archived, data.expectedVersion);
  }
  @Post('classroom/announcements/:id/read')
  read(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.readAnnouncement(u, id);
  }
  @Get('classroom/announcements/:id/history')
  postHistory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(classroomPageSchema)) q: { page: number },
  ) {
    return this.svc.history(u, 'announcement', id, q.page);
  }
  @Post('classroom/announcements/:id/restore')
  restorePost(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(restoreSchema)) data: { revisionId: string; expectedVersion: number },
  ) {
    return this.svc.restoreRevision(u, 'announcement', id, data.revisionId, data.expectedVersion);
  }
  @Get('classroom/announcements/:id/replies')
  announcementReplies(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.replies(u, 'announcement', id);
  }
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('classroom/announcements/:id/replies')
  announcementReply(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomReplySchema)) data: { body: string },
  ) {
    return this.svc.reply(u, 'announcement', id, data.body);
  }

  @Get('groups/:id/classroom/questions')
  questions(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(questionQuery)) q: { page: number; assignmentId?: string },
  ) {
    return this.svc.questions(u, id, q.page, q.assignmentId);
  }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('groups/:id/classroom/questions')
  ask(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomQuestionSchema)) data: ClassroomQuestionInput,
  ) {
    return this.svc.ask(u, id, data);
  }
  @Get('classroom/questions/:id')
  question(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.question(u, id);
  }
  @Post('classroom/questions/:id/resolve')
  resolve(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(resolvedSchema)) data: { resolved: boolean },
  ) {
    return this.svc.resolve(u, id, data.resolved);
  }
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('classroom/questions/:id/replies')
  questionReply(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(classroomReplySchema)) data: { body: string },
  ) {
    return this.svc.reply(u, 'question', id, data.body);
  }
  @Post('classroom/replies/:id/hide')
  hideReply(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.hideReply(u, id);
  }

  @Post('classroom/lessons/:id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.ACADEMY_MAX_FILE_MB * 1024 * 1024, files: 1 },
    }),
  )
  file(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED');
    return this.svc.addFile(u, id, {
      buffer: file.buffer,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    });
  }
  @Post('classroom/announcements/:id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.ACADEMY_MAX_FILE_MB * 1024 * 1024, files: 1 },
    }),
  )
  announcementFile(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED');
    return this.svc.addFile(
      u,
      id,
      { buffer: file.buffer, filename: Buffer.from(file.originalname, 'latin1').toString('utf8') },
      'announcement',
    );
  }
  @Post('classroom/files/:id/hide')
  hideFile(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.removeFile(u, id);
  }
  @Get('classroom/files/:id')
  async download(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const file = await this.svc.file(u, id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res
      .attachment(file.filename)
      .type(file.mime)
      .sendFile(file.path, (err) => {
        if (err && !res.headersSent)
          res.status(404).json({ code: 'ACADEMY_FILE_NOT_FOUND', message: 'Fayl tapılmadı' });
      });
  }
}
