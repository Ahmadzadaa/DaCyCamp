import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import { PackageService } from './package.service';
import { CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest } from '../common/errors';
import { env } from '../config/env';

const listQuery = z.object({ courseId: z.string().optional() });
const zipLimit = { limits: { fileSize: Math.max(env.MAX_UPLOAD_MB, 200) * 1024 * 1024 } };

@Staff()
@Controller('admin')
export class ImportExportController {
  constructor(private readonly pkg: PackageService) {}

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file', zipLimit))
  async validate(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'ZIP faylı göndərilməyib');
    const { report } = await this.pkg.validate(file.buffer);
    return report;
  }

  @Post('import/apply')
  @UseInterceptors(FileInterceptor('file', zipLimit))
  async apply(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() u: AuthUser) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'ZIP faylı göndərilməyib');
    return this.pkg.apply(
      file.buffer,
      Buffer.from(file.originalname, 'latin1').toString('utf8'),
      u.id,
    );
  }

  @Get('imports')
  list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.pkg.list(q.courseId);
  }

  @Get('courses/:id/export.zip')
  async exportZip(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.pkg.exportZip(id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
