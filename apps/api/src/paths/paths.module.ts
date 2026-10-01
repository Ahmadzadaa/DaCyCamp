import { Module } from '@nestjs/common';
import { PathsService } from './paths.service';
@Module({ providers: [PathsService], exports: [PathsService] })
export class PathsModule {}
