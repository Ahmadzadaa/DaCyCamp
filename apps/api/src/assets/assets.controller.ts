import { Audit } from '../audit/audit.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ASSET_KINDS } from '@dacy/shared';
import { AssetsService } from './assets.service';
import { CurrentUser, OptionalAuth, Staff, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest, forbidden, notFound, unauthorized } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { storagePath } from './storage';
import { env } from '../config/env';

const uploadBody = z.object({
  path: z.string().trim().max(300).optional(),
  kind: z.enum(ASSET_KINDS).optional(),
});
const listQuery = z.object({ kind: z.enum(ASSET_KINDS).optional() });
const replaceQuery = z.object({ replace: z.enum(['1', 'true']).optional() });

@Controller()
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly prisma: PrismaService,
  ) {}

  @Staff()
  @Get('admin/courses/:id/assets')
  list(@Param('id') id: string, @Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.assets.list(id, q.kind);
  }

  @Staff()
  @Audit({ action: 'asset.upload', entity: 'ASSET', target: 'result', result: ['path', 'kind'] })
  @Post('admin/courses/:id/assets')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 } }),
  )
  upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(uploadBody)) body: z.infer<typeof uploadBody>,
    @Query(new ZodPipe(replaceQuery)) q: z.infer<typeof replaceQuery>,
    @CurrentUser() u: AuthUser,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'Fayl göndərilməyib');
    return this.assets.upload({
      courseId: id,
      buffer: file.buffer,
      filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      mime: file.mimetype,
      path: body.path,
      kind: body.kind,
      replace: !!q.replace,
      uploadedById: u.id,
    });
  }

  @Staff()
  @Audit({ action: 'asset.delete', entity: 'ASSET' })
  @Delete('admin/assets/:id')
  remove(@Param('id') id: string) {
    return this.assets.remove(id);
  }

  /** Üz şəkli hamıya; CHECK_SCRIPT yalnız heyətə; qalanı yazılmış tələbə və ya heyətə */
  @OptionalAuth()
  @Get('assets/:id/:filename')
  async serve(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
    @Res() res: Response,
  ) {
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: { course: { select: { coverAssetId: true, id: true, deletedAt: true } } },
    });
    if (!a) throw notFound();
    const staffUser = req.user && (req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR');
    if (a.course.deletedAt && !staffUser) throw notFound();
    const isCover = a.course.coverAssetId === a.id;
    const user = req.user;
    const staff = user && (user.role === 'ADMIN' || user.role === 'INSTRUCTOR');
    if (a.kind === 'CHECK_SCRIPT' && !staff) throw forbidden();
    if (!isCover && !staff) {
      if (!user) throw unauthorized();
      const enrolled = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: a.courseId } },
      });
      if (!enrolled) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
    }
    res.setHeader('Cache-Control', isCover ? 'public, max-age=3600' : 'private, max-age=300');
    res.type(a.mime);
    res.sendFile(storagePath(a.storageKey), (err) => {
      if (err && !res.headersSent)
        res.status(404).json({ code: 'NOT_FOUND', message: 'Fayl tapılmadı', statusCode: 404 });
    });
  }
}
