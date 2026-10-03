import { Body, Controller, Get, Put } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { az, levelLabelsSchema, type LevelLabels } from '@dacy/shared';
import { Audit } from '../audit/audit.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { AdminOnly, Public } from '../common/decorators';

const DEFAULT_LEVELS: LevelLabels = { ...az.level };

/** Sayt ayarları: hələlik səviyyə adları (kataloq filtri, kartlar) */
@Controller()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  private async levels(): Promise<LevelLabels> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'levels' } });
    const parsed = levelLabelsSchema.partial().safeParse(row?.value ?? {});
    return { ...DEFAULT_LEVELS, ...(parsed.success ? parsed.data : {}) };
  }

  @Public()
  @Get('settings/levels')
  getLevels() {
    return this.levels();
  }

  @AdminOnly()
  @Audit({
    action: 'settings.levels',
    entity: 'SETTING',
    target: { param: '_' },
    body: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
  })
  @Put('admin/settings/levels')
  async setLevels(@Body(new ZodPipe(levelLabelsSchema)) dto: LevelLabels) {
    await this.prisma.setting.upsert({
      where: { key: 'levels' },
      create: { key: 'levels', value: dto as unknown as Prisma.InputJsonValue },
      update: { value: dto as unknown as Prisma.InputJsonValue },
    });
    return this.levels();
  }
}
