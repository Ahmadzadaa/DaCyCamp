import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AcademyAccessService, AcademyEnabledGuard } from './access/academy-access.service';
import { AcademyOrganizationController } from './organization/organization.controller';
import { AcademyOrganizationService } from './organization/organization.service';

/**
 * Akademiya modulu (modul monolit). Öyrənmə nüvəsi ilə yalnız `integrations/` adapterləri vasitəsilə danışır:
 * məzmun kopyalanmır, qiymətləndirmə təkrar yazılmır, XP-yə toxunulmur.
 */
@Module({
  imports: [AuditModule],
  controllers: [AcademyOrganizationController],
  providers: [AcademyAccessService, AcademyEnabledGuard, AcademyOrganizationService],
  exports: [AcademyAccessService],
})
export class AcademyModule {}
