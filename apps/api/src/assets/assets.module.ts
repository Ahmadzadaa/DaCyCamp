import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { SqlCheckModule } from '../sql-check/sql-check.module';
import { ProgressModule } from '../progress/progress.module';
@Module({
  imports: [SqlCheckModule, ProgressModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
