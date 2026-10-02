import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { PathsModule } from './paths.module';
import { PathsLearnService } from './paths-learn.service';
import { PathsAdminService } from './paths-admin.service';
import { PathsController } from './paths.controller';
import { PathsAdminController } from './paths-admin.controller';

/** Tələbə + admin API (ProgressModule-a bağlıdır; ProgressModule yalnız PathsModule-u import edir → dövr yoxdur) */
@Module({
  imports: [ProgressModule, PathsModule],
  controllers: [PathsController, PathsAdminController],
  providers: [PathsLearnService, PathsAdminService],
  exports: [PathsLearnService, PathsAdminService],
})
export class PathsLearnModule {}
