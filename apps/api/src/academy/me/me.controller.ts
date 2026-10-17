import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import {
  academyDraftSchema,
  academySubmitSchema,
  idSchema,
  type AcademyDraftInput,
  type AcademySubmitInput,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { badRequest } from '../../common/errors';
import { env } from '../../config/env';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyFilesService } from '../files/files.service';
import { AcademySubmissionsService } from '../submissions/submissions.service';
import { AcademyStudentService } from './student.service';

const myAssignmentsQuery = z.object({
  type: z
    .enum(['EXISTING_CHALLENGE', 'CUSTOM_TASK', 'CODING_TASK', 'FILE_BASED', 'LAB', 'PROJECT'])
    .optional(),
  groupId: idSchema.optional(),
});

/** Tələbə görünüşü: yalnız öz qeydləri (istifadəçi sorğudan yox, sessiyadan götürülür) */
@Controller('academy/me')
@UseGuards(AcademyEnabledGuard)
export class AcademyMeController {
  constructor(
    private readonly svc: AcademyStudentService,
    private readonly submissions: AcademySubmissionsService,
    private readonly files: AcademyFilesService,
  ) {}

  @Get('overview')
  overview(@CurrentUser() u: AuthUser) {
    return this.svc.overview(u);
  }

  @Get('assignments')
  assignments(
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(myAssignmentsQuery)) q: { type?: string; groupId?: string },
  ) {
    return this.svc.myAssignments(u, q);
  }

  @Get('assignments/:id')
  assignment(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.myAssignment(u, id);
  }

  @Post('assignments/:id/items/:itemId/open')
  @HttpCode(200)
  open(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.svc.openItem(u, id, itemId);
  }

  @Put('assignments/:id/draft')
  saveDraft(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyDraftSchema)) body: AcademyDraftInput,
  ) {
    return this.submissions.saveDraft(u, id, body);
  }

  @Delete('assignments/:id/draft')
  deleteDraft(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.submissions.deleteDraft(u, id);
  }

  /** Yeni cəhd — 201; eyni idempotency açarı ilə təkrar — 200 və əvvəlki cəhdin qəbzi */
  @Post('assignments/:id/attempts')
  async submit(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academySubmitSchema)) body: AcademySubmitInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const receipt = await this.submissions.submit(u, id, body);
    if (receipt.replayed) res.status(200);
    return receipt;
  }

  /** Göndəriş faylı (müvəqqəti; göndərişdə cəhdə bağlanır) */
  @Post('assignments/:id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.ACADEMY_MAX_FILE_MB * 1024 * 1024, files: 1 },
    }),
  )
  stage(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'Fayl göndərilməyib');
    return this.files.stageSubmissionFile(u, id, {
      buffer: file.buffer,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    });
  }

  @Delete('files/:id')
  deleteStaged(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.files.deleteStaged(u, id);
  }

  @Get('grades')
  grades(@CurrentUser() u: AuthUser) {
    return this.svc.myGrades(u);
  }
}
