import { Module } from '@nestjs/common';
import { SqlCheckService } from './sql-check.service';
@Module({ providers: [SqlCheckService], exports: [SqlCheckService] })
export class SqlCheckModule {}
