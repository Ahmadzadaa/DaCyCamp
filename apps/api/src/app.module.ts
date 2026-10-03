import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { SqlCheckModule } from './sql-check/sql-check.module';
import { ImportExportModule } from './import-export/import-export.module';
import { LabsModule } from './labs/labs.module';
import { CertificatesModule } from './certificates/certificates.module';
import { PathsLearnModule } from './paths/paths-learn.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';
import { TracksModule } from './tracks/tracks.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContentModule } from './content/content.module';
import { AssetsModule } from './assets/assets.module';
import { LearnModule } from './learn/learn.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PathsModule } from './paths/paths.module';
import { ProgressModule } from './progress/progress.module';
import { AuditModule } from './audit/audit.module';
import { AdminOverviewModule } from './admin-overview/admin-overview.module';
import { HubModule } from './hub/hub.module';
import { TopicsModule } from './topics/topics.module';
import { RoadmapsModule } from './roadmaps/roadmaps.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    TracksModule,
    CatalogModule,
    ContentModule,
    AssetsModule,
    ProgressModule,
    LearnModule,
    DashboardModule,
    PathsModule,
    SqlCheckModule,
    ImportExportModule,
    LabsModule,
    CertificatesModule,
    PathsLearnModule,
    AdminOverviewModule,
    HubModule,
    TopicsModule,
    RoadmapsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    // sıra vacibdir: əvvəl auth (req.user), sonra istifadəçiyə görə limit, sonra rollar
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
