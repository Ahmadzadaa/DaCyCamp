import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { contentI18nExtension } from './content-i18n';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // məzmun tərcümələri (tələbə sorğularında dilə görə) — eyni sinif tipi ilə qaytarılır
    return this.$extends(contentI18nExtension) as unknown as PrismaService;
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
