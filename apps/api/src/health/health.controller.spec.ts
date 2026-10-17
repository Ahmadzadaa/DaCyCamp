import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

const ctrl = (ok: boolean) =>
  new HealthController({
    $queryRaw: () =>
      ok ? Promise.resolve([{ '?column?': 1 }]) : Promise.reject(new Error('down')),
  } as unknown as PrismaService);

describe('HealthController', () => {
  it('baza işləyirsə ok: true', async () => {
    await expect(ctrl(true).get()).resolves.toMatchObject({ ok: true, db: true });
  });

  it('baza əlçatmazdırsa 503 qaytarır (monitorinq serveri sağlam saymasın)', async () => {
    const err = await ctrl(false)
      .get()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getStatus()).toBe(503);
    expect((err as ServiceUnavailableException).getResponse()).toMatchObject({
      ok: false,
      db: false,
    });
  });
});
