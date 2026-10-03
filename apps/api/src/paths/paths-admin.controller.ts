import { Audit } from '../audit/audit.interceptor';
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
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  pathInputSchema,
  pathItemInputSchema,
  pathItemsOrderSchema,
  projectReviewSchema,
  type PathInput,
  type PathItemInput,
} from '@dacy/shared';
import { CurrentUser, Staff, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { badRequest } from '../common/errors';
import { PathsAdminService } from './paths-admin.service';

const publishBody = z.object({ published: z.boolean() });
const reviewsQuery = z.object({ status: z.enum(['SUBMITTED', 'PASSED', 'FAILED']).optional() });
const forceQuery = z.object({ force: z.enum(['1', 'true']).optional() });

@Staff()
@Controller()
export class PathsAdminController {
  constructor(private readonly admin: PathsAdminService) {}

  @Get('admin/paths')
  list() {
    return this.admin.list();
  }

  @Audit({ action: 'path.create', entity: 'PATH', target: 'result' })
  @Post('admin/paths')
  create(@Body(new ZodPipe(pathInputSchema)) body: PathInput) {
    return this.admin.create(body);
  }

  @Get('admin/paths/:slug')
  get(@Param('slug') slug: string) {
    return this.admin.get(slug);
  }

  @Audit({ action: 'path.update', entity: 'PATH' })
  @Put('admin/paths/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodPipe(pathInputSchema.partial())) body: Partial<PathInput>,
  ) {
    return this.admin.update(id, body);
  }

  @Audit({ action: 'path.delete', entity: 'PATH' })
  @Delete('admin/paths/:id')
  remove(@Param('id') id: string, @Query(new ZodPipe(forceQuery)) q: { force?: string }) {
    return this.admin.remove(id, !!q.force);
  }

  @Audit({ action: 'path.publish', entity: 'PATH', body: ['published'] })
  @Post('admin/paths/:id/publish')
  @HttpCode(200)
  publish(@Param('id') id: string, @Body(new ZodPipe(publishBody)) body: { published: boolean }) {
    return this.admin.publish(id, body.published);
  }

  @Audit({ action: 'path.item_add', entity: 'PATH' })
  @Post('admin/paths/:id/items')
  addItem(@Param('id') id: string, @Body(new ZodPipe(pathItemInputSchema)) body: PathItemInput) {
    return this.admin.addItem(id, body);
  }

  @Audit({ action: 'path.reorder', entity: 'PATH' })
  @Put('admin/paths/:id/items/order')
  reorder(
    @Param('id') id: string,
    @Body(new ZodPipe(pathItemsOrderSchema)) body: { ids: string[] },
  ) {
    return this.admin.reorder(id, body.ids);
  }

  @Audit({ action: 'path.item_update', entity: 'PATH' })
  @Put('admin/path-items/:id')
  updateItem(@Param('id') id: string, @Body(new ZodPipe(pathItemInputSchema)) body: PathItemInput) {
    return this.admin.updateItem(id, body);
  }

  @Audit({ action: 'path.item_delete', entity: 'PATH' })
  @Delete('admin/path-items/:id')
  removeItem(@Param('id') id: string) {
    return this.admin.removeItem(id);
  }

  @Get('admin/paths/:id/export.yaml')
  async exportYaml(@Param('id') id: string, @Res() res: Response) {
    const { text, filename } = await this.admin.exportYaml(id);
    res.setHeader('content-type', 'application/yaml; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="${filename}"`);
    res.send(text);
  }

  @Get('admin/path-reviews')
  reviews(@Query(new ZodPipe(reviewsQuery)) q: { status?: 'SUBMITTED' | 'PASSED' | 'FAILED' }) {
    return this.admin.reviews(q.status);
  }

  @Post('admin/path-reviews/:id')
  @HttpCode(200)
  review(
    @Param('id') id: string,
    @Body(new ZodPipe(projectReviewSchema)) body: { passed: boolean; feedback?: string },
    @CurrentUser() u: AuthUser,
  ) {
    return this.admin.review(id, body, u.id);
  }

  @Get('admin/path-reviews/:id/files/:index')
  async file(@Param('id') id: string, @Param('index') index: string, @Res() res: Response) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0) throw badRequest('VALIDATION_FAILED');
    const f = await this.admin.reviewFile(id, i);
    res.setHeader('content-type', 'application/octet-stream');
    res.setHeader(
      'content-disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
    );
    res.send(f.buffer);
  }
}
