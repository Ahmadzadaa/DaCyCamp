import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { LabsController } from './labs.controller';
import { LabsGateway } from './labs.gateway';
import { LabsService } from './labs.service';

@Module({
  imports: [ProgressModule],
  controllers: [LabsController],
  providers: [LabsService, LabsGateway],
  exports: [LabsService],
})
export class LabsModule {}
