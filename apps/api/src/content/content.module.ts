import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { SqlCheckModule } from '../sql-check/sql-check.module';
import { ProgressModule } from '../progress/progress.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { CourseStudentsService } from './course-students.service';
@Module({
  imports: [AssetsModule, SqlCheckModule, ProgressModule],
  controllers: [ContentController],
  providers: [ContentService, CourseStudentsService],
  exports: [ContentService],
})
export class ContentModule {}
