import { Module } from '@nestjs/common';
import { PathsModule } from '../paths/paths.module';
import { ProgressService } from './progress.service';
@Module({ imports: [PathsModule], providers: [ProgressService], exports: [ProgressService] })
export class ProgressModule {}
