import { Module } from '@nestjs/common';
import { CertificatesModule } from '../certificates/certificates.module';
import { PathsService } from './paths.service';

/** Nüvə: ProgressService-in kurs bitəndə çağırdığı hook + xəritə hesablanması (ProgressModule-dan asılı deyil) */
@Module({ imports: [CertificatesModule], providers: [PathsService], exports: [PathsService] })
export class PathsModule {}
