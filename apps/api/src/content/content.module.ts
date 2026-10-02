import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { SqlCheckModule } from '../sql-check/sql-check.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
@Module({
  imports: [AssetsModule, SqlCheckModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
