import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { idSchema } from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyStudentService } from './student.service';

const myAssignmentsQuery = z.object({
  type: z.enum(['EXISTING_CHALLENGE', 'CUSTOM_TASK', 'CODING_TASK', 'FILE_BASED', 'LAB', 'PROJECT']).optional(),
  groupId: idSchema.optional(),
});

/** Tələbə görünüşü: yalnız öz qeydləri (istifadəçi sorğudan yox, sessiyadan götürülür) */
@Controller('academy/me')
@UseGuards(AcademyEnabledGuard)
export class AcademyMeController {
  constructor(private readonly svc: AcademyStudentService) {}

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

  @Get('grades')
  grades(@CurrentUser() u: AuthUser) {
    return this.svc.myGrades(u);
  }
}
