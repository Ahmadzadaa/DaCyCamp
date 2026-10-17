import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  academyEnrollmentCreateSchema,
  academyEnrollmentUpdateSchema,
  academyGroupCreateSchema,
  academyGroupUpdateSchema,
  academyInstructorAssignSchema,
  academyPageQuery,
  academyProgramCreateSchema,
  academyProgramUpdateSchema,
  idSchema,
  type AcademyEnrollmentCreateInput,
  type AcademyEnrollmentUpdateInput,
  type AcademyGroupCreateInput,
  type AcademyGroupUpdateInput,
  type AcademyInstructorAssignInput,
  type AcademyPageQuery,
  type AcademyProgramCreateInput,
  type AcademyProgramUpdateInput,
} from '@dacy/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AcademyEnabledGuard } from '../access/academy-access.service';
import { AcademyOrganizationService } from './organization.service';

const groupListQuery = academyPageQuery.extend({ programId: idSchema.optional() });
const courseLinksSchema = z.object({ courseIds: z.array(idSchema).max(50) });

/** Proqramlar, qruplar, müəllimlər, yazılışlar. İcazə xidmətdə (resurs səviyyəsində) yoxlanılır. */
@Controller('academy')
@UseGuards(AcademyEnabledGuard)
export class AcademyOrganizationController {
  constructor(private readonly org: AcademyOrganizationService) {}

  @Get('programs')
  programs(@CurrentUser() u: AuthUser) {
    return this.org.listPrograms(u);
  }

  @Post('programs')
  createProgram(
    @CurrentUser() u: AuthUser,
    @Body(new ZodPipe(academyProgramCreateSchema)) body: AcademyProgramCreateInput,
  ) {
    return this.org.createProgram(u, body);
  }

  @Patch('programs/:id')
  updateProgram(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyProgramUpdateSchema)) body: AcademyProgramUpdateInput,
  ) {
    return this.org.updateProgram(u, id, body);
  }

  @Get('groups')
  groups(
    @CurrentUser() u: AuthUser,
    @Query(new ZodPipe(groupListQuery)) q: AcademyPageQuery & { programId?: string },
  ) {
    return this.org.listGroups(u, q);
  }

  @Post('groups')
  createGroup(
    @CurrentUser() u: AuthUser,
    @Body(new ZodPipe(academyGroupCreateSchema)) body: AcademyGroupCreateInput,
  ) {
    return this.org.createGroup(u, body);
  }

  @Get('groups/:id')
  group(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.org.getGroup(u, id);
  }

  @Patch('groups/:id')
  updateGroup(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyGroupUpdateSchema)) body: AcademyGroupUpdateInput,
  ) {
    return this.org.updateGroup(u, id, body);
  }

  @Post('groups/:id/instructors')
  assignInstructor(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyInstructorAssignSchema)) body: AcademyInstructorAssignInput,
  ) {
    return this.org.assignInstructor(u, id, body);
  }

  @Delete('groups/:id/instructors/:userId')
  removeInstructor(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    return this.org.removeInstructor(u, id, userId);
  }

  @Get('groups/:id/students')
  students(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Query(new ZodPipe(academyPageQuery)) q: AcademyPageQuery,
  ) {
    return this.org.listStudents(u, id, q);
  }

  @Post('groups/:id/enrollments')
  enroll(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyEnrollmentCreateSchema)) body: AcademyEnrollmentCreateInput,
  ) {
    return this.org.enroll(u, id, body);
  }

  @Patch('enrollments/:id')
  updateEnrollment(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(academyEnrollmentUpdateSchema)) body: AcademyEnrollmentUpdateInput,
  ) {
    return this.org.updateEnrollment(u, id, body);
  }

  @Get('enrollments/:id/history')
  enrollmentHistory(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.org.enrollmentHistory(u, id);
  }

  @Get('groups/:id/courses')
  courseLinks(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.org.listCourseLinks(u, id);
  }

  @Put('groups/:id/courses')
  setCourseLinks(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(courseLinksSchema)) body: { courseIds: string[] },
  ) {
    return this.org.setCourseLinks(u, id, body.courseIds);
  }
}
