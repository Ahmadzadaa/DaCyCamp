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
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { diskStorage } from 'multer';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ASSET_KINDS } from '@dacy/shared';
import { AssetsService } from './assets.service';
import { CurrentUser, OptionalAuth, Staff, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest, forbidden, notFound, unauthorized } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { detectKind, storagePath } from './storage';
import { env } from '../config/env';

const uploadBody = z.object({
  path: z.string().trim().max(300).optional(),
  kind: z.enum(ASSET_KINDS).optional(),
});
const listQuery = z.object({ kind: z.enum(ASSET_KINDS).optional() });
const replaceQuery = z.object({ replace: z.enum(['1', 'true']).optional() });

/** Brauzerin yerində açmasına icazə verilən növlər (skript işlədə bilməz) */
const INLINE_SAFE =
  /^(image\/(png|jpe?g|gif|webp|avif)|video\/[\w.+-]+|audio\/[\w.+-]+|application\/pdf)$/;
/** Skript işlədə bilən növlər — öz tipi ilə heç vaxt verilmir (saxlanılmış XSS) */
const ACTIVE_TYPES =
  /^(text\/html|application\/xhtml\+xml|text\/javascript|application\/(x-)?javascript|application\/ecmascript|text\/xml|application\/xml)$/;

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

  /** Video dərs: böyük fayl diskə axınla yazılır (MAX_VIDEO_MB), sonra kursun fayllarına köçürülür */
  @Staff()
  @Audit({ action: 'asset.upload', entity: 'ASSET', target: 'result', result: ['path', 'kind'] })
  @Post('admin/courses/:id/videos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: env.MAX_VIDEO_MB * 1024 * 1024 },
    }),
  )
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(uploadBody)) body: z.infer<typeof uploadBody>,
    @Query(new ZodPipe(replaceQuery)) q: z.infer<typeof replaceQuery>,
    @CurrentUser() u: AuthUser,
  ) {
    if (!file) throw badRequest('VALIDATION_FAILED', 'Fayl göndərilməyib');
    try {
      const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (detectKind(filename, file.mimetype) !== 'VIDEO')
        throw badRequest('VALIDATION_FAILED', 'Yalnız video faylı (mp4, webm, mov, m4v)');
      return await this.assets.uploadFile({
        courseId: id,
        tmpPath: file.path,
        filename,
        mime: file.mimetype,
        path: body.path,
        kind: 'VIDEO',
        replace: !!q.replace,
        uploadedById: u.id,
      });
    } finally {
      await rm(file.path, { force: true });
    }
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
    // Fayllar saytla eyni ünvandan (/api/assets) verilir: yüklənmiş HTML/SVG/JS yerində açılsa, açan
    // istifadəçinin sessiyası ilə skript işləyərdi. Təhlükəsiz növlər yerində, qalanı endirmə kimi.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const mime = (a.mime || 'application/octet-stream').toLowerCase().split(';')[0]!.trim();
    if (INLINE_SAFE.test(mime)) {
      res.type(mime);
    } else {
      res.attachment(a.filename);
      res.type(ACTIVE_TYPES.test(mime) ? 'application/octet-stream' : mime);
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      );
    }
    res.sendFile(storagePath(a.storageKey), (err) => {
      if (err && !res.headersSent)
        res.status(404).json({ code: 'NOT_FOUND', message: 'Fayl tapılmadı', statusCode: 404 });
    });
  }
}
