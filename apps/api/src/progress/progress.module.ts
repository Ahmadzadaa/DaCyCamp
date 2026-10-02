import { Module } from '@nestjs/common';
import { PathsModule } from '../paths/paths.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { ProgressService } from './progress.service';
@Module({
  imports: [PathsModule, CertificatesModule],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
