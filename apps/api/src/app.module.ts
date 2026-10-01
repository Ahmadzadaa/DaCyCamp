import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
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
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
