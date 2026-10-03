import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { PathsLearnModule } from '../paths/paths-learn.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { NotificationsService } from './notifications.service';
@Module({
  imports: [ProgressModule, PathsLearnModule],
  controllers: [DashboardController],
  providers: [DashboardService, NotificationsService],
  exports: [DashboardService],
})
export class DashboardModule {}
