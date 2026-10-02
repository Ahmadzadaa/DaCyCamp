import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { SqlCheckModule } from '../sql-check/sql-check.module';
import { PathsLearnModule } from '../paths/paths-learn.module';
import { ImportExportController } from './import-export.controller';
import { PackageService } from './package.service';
@Module({
  imports: [ProgressModule, SqlCheckModule, PathsLearnModule],
  controllers: [ImportExportController],
  providers: [PackageService],
  exports: [PackageService],
})
export class ImportExportModule {}
