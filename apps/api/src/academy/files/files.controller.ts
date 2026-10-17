import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { badRequest } from '../../common/errors';
import { env } from '../../config/env';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyFilesService } from './files.service';

/** Tapşırıq resursları (heyət) və icazə yoxlamalı endirmə (hamı — öz hüququ daxilində) */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyFilesController {
  constructor(private readonly files: AcademyFilesService) {}

  @Post('assignments/:id/resources')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: env.ACADEMY_MAX_FILE_MB * 1024 * 1024, files: 1 },
    }),
  )
  addResource(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'Fayl göndərilməyib');
    return this.files.addResource(u, id, {
      buffer: file.buffer,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    });
  }

  @Delete('assignments/:id/resources/:fileId')
  removeResource(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return this.files.removeResource(u, id, fileId);
  }

  /** Həmişə «attachment» kimi, nosniff ilə — brauzer faylı səhifə kimi icra etmir */
  @Get('files/:id')
  async download(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const f = await this.files.authorizeDownload(u, id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.attachment(f.filename);
    res.type(f.mime);
    res.sendFile(f.path, (err) => {
      if (err && !res.headersSent)
        res
          .status(404)
          .json({ code: 'ACADEMY_FILE_NOT_FOUND', message: 'Fayl tapılmadı', statusCode: 404 });
    });
  }
}
