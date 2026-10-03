import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { LEVELS } from '@dacy/shared';
import { CatalogService } from './catalog.service';
import { OptionalAuth, type AuthUser } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';

const listQuery = z.object({
  track: z.string().max(80).optional(),
  level: z.enum(LEVELS).optional(),
  q: z.string().trim().max(100).optional(),
  topic: z.string().max(80).optional(),
});

@Controller('courses')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @OptionalAuth()
  @Get()
  list(
    @Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>,
    @Req() req: { user?: AuthUser },
  ) {
    return this.catalog.list({ ...q, userId: req.user?.id });
  }

  @OptionalAuth()
  @Get(':slug')
  outline(@Param('slug') slug: string, @Req() req: { user?: AuthUser }) {
    const staff = req.user?.role === 'ADMIN' || req.user?.role === 'INSTRUCTOR';
    return this.catalog.outline(slug, { userId: req.user?.id, staff });
  }
}
