import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { PathsModule } from '../paths/paths.module';
import { HubController } from './hub.controller';
import { HubService } from './hub.service';

/** Öyrənmə mərkəzi: Fəaliyyətim, Liderlər, Təcrübə, İmtahanlar, Layihələr, Yarışlar */
@Module({
  imports: [ProgressModule, PathsModule],
  controllers: [HubController],
  providers: [HubService],
})
export class HubModule {}
