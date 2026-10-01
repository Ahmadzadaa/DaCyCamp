import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ProgressModule } from '../progress/progress.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
@Module({
  imports: [ProgressModule, CatalogModule, AssetsModule],
  controllers: [LearnController],
  providers: [LearnService],
})
export class LearnModule {}
