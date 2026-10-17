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

/**
 * Akademiya modulu (modul monolit). Öyrənmə nüvəsi ilə yalnız `integrations/` adapterləri vasitəsilə danışır:
 * məzmun kopyalanmır, qiymətləndirmə təkrar yazılmır, XP-yə toxunulmur.
 */
@Module({
  imports: [AuditModule, LearnModule, ProgressModule],
  controllers: [AcademyOrganizationController, AcademyAssignmentsController, AcademyMeController, AcademyFilesController, AcademyGradingController],
  providers: [
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
  ],
  exports: [AcademyAccessService],
})
export class AcademyModule {}
