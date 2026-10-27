import { Module } from '@nestjs/common';
import { PythonCheckService } from './python-check.service';
@Module({ providers: [PythonCheckService], exports: [PythonCheckService] })
export class PythonCheckModule {}
