import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LearnModule } from '../learn/learn.module';
import { ProgressModule } from '../progress/progress.module';
import { AcademyAccessService, AcademyEnabledGuard } from './access/academy-access.service';
import { AcademyContentAdapter } from './integrations/content.adapter';
import { AcademyEvaluationAdapter } from './integrations/evaluation.adapter';
import { AcademyOrganizationController } from './organization/organization.controller';
import { AcademyOrganizationService } from './organization/organization.service';
import { AcademyAssignmentsController } from './assignments/assignments.controller';
import { AcademyAssignmentsService } from './assignments/assignments.service';
import { AcademyMeController } from './me/me.controller';
import { AcademyStudentService } from './me/student.service';
import { AcademyFilesController } from './files/files.controller';
import { AcademyFilesService } from './files/files.service';
import { AcademySubmissionsService } from './submissions/submissions.service';
import { AcademyGradingController } from './grading/grading.controller';
import { AcademyGradingService } from './grading/grading.service';
import { AcademyClassesController } from './classes/classes.controller';
import { AcademyClassesService } from './classes/classes.service';
import { AcademyAnalyticsController } from './analytics/analytics.controller';
import { AcademyAnalyticsService } from './analytics/analytics.service';
import { AcademyNotificationsService } from './notifications/academy-notifications.service';
import { AcademyWorkerService } from './notifications/academy-worker.service';
import { AcademyJoinController } from './join/join.controller';
import { AcademyJoinService } from './join/join.service';
import { ClassroomController } from './classroom/classroom.controller';
import { ClassroomService } from './classroom/classroom.service';

/**
 * Akademiya modulu (modul monolit). Öyrənmə nüvəsi ilə yalnız `integrations/` adapterləri vasitəsilə danışır:
 * məzmun kopyalanmır, qiymətləndirmə təkrar yazılmır, XP-yə toxunulmur.
 */
@Module({
  imports: [AuditModule, LearnModule, ProgressModule],
  controllers: [
    ClassroomController,
    AcademyOrganizationController,
    AcademyAssignmentsController,
    AcademyMeController,
    AcademyFilesController,
    AcademyGradingController,
    AcademyClassesController,
    AcademyAnalyticsController,
    AcademyJoinController,
  ],
  providers: [
    ClassroomService,
    AcademyAccessService,
    AcademyEnabledGuard,
    AcademyContentAdapter,
    AcademyEvaluationAdapter,
    AcademyOrganizationService,
    AcademyAssignmentsService,
    AcademyStudentService,
    AcademyFilesService,
    AcademySubmissionsService,
    AcademyGradingService,
    AcademyClassesService,
    AcademyAnalyticsService,
    AcademyNotificationsService,
    AcademyWorkerService,
    AcademyJoinService,
  ],
  exports: [AcademyAccessService, AcademyNotificationsService],
})
export class AcademyModule {}
