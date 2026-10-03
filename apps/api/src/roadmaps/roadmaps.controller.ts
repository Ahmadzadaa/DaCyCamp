import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { reorderSchema, roadmapInputSchema, type RoadmapInput } from '@dacy/shared';
import { Audit } from '../audit/audit.interceptor';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, CurrentUser, OptionalAuth, Public, type AuthUser } from '../common/decorators';
import { RoadmapsService } from './roadmaps.service';

const checkSchema = z.object({ checked: z.boolean() });

/** Karyera xəritələri: ictimai baxış, tələbənin işarələri, admin redaktəsi (yalnız ADMIN) */
@Controller()
export class RoadmapsController {
  constructor(private readonly roadmaps: RoadmapsService) {}

  @Public()
  @Get('roadmaps')
  list() {
    return this.roadmaps.list();
  }

  @OptionalAuth()
  @Get('roadmaps/:slug')
  get(@Param('slug') slug: string, @CurrentUser() u: AuthUser | undefined) {
    return this.roadmaps.get(slug, u?.id ?? null);
  }

  @Put('roadmaps/:slug/checks/:skillId')
  check(
    @Param('slug') slug: string,
    @Param('skillId') skillId: string,
    @Body(new ZodPipe(checkSchema)) dto: { checked: boolean },
    @CurrentUser() u: AuthUser,
  ) {
    return this.roadmaps.setCheck(slug, u.id, skillId, dto.checked);
  }

  @AdminOnly()
  @Get('admin/roadmaps')
  adminList() {
    return this.roadmaps.adminList();
  }

  @AdminOnly()
  @Get('admin/roadmaps/:id')
  adminGet(@Param('id') id: string) {
    return this.roadmaps.adminGet(id);
  }

  @AdminOnly()
  @Audit({ action: 'roadmap.create', entity: 'ROADMAP', target: 'result' })
  @Post('admin/roadmaps')
  create(@Body(new ZodPipe(roadmapInputSchema)) dto: RoadmapInput) {
    return this.roadmaps.create(dto);
  }

  @AdminOnly()
  @Audit({ action: 'roadmap.reorder', entity: 'ROADMAP', target: { param: '_' } })
  @Patch('admin/roadmaps/reorder')
  reorder(@Body(new ZodPipe(reorderSchema)) dto: { ids: string[] }) {
    return this.roadmaps.reorder(dto.ids);
  }

  @AdminOnly()
  @Audit({ action: 'roadmap.update', entity: 'ROADMAP', body: ['isPublished'] })
  @Put('admin/roadmaps/:id')
  update(@Param('id') id: string, @Body(new ZodPipe(roadmapInputSchema)) dto: RoadmapInput) {
    return this.roadmaps.update(id, dto);
  }

  @AdminOnly()
  @Audit({ action: 'roadmap.delete', entity: 'ROADMAP' })
  @Delete('admin/roadmaps/:id')
  remove(@Param('id') id: string) {
    return this.roadmaps.remove(id);
  }
}
