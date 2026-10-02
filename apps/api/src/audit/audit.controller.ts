import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { AdminOnly } from '../common/decorators';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AuditService } from './audit.service';

const listQuery = z.object({
  courseId: z.string().max(40).optional(),
  actorId: z.string().max(40).optional(),
  action: z.string().max(60).optional(),
  cursor: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

@AdminOnly()
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query(new ZodPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.audit.list(q);
  }
}
