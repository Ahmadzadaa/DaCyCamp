import { Controller, Get } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { AdminOnly } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { executionStatus } from '../common/execution-pool';

@Controller('admin/operations')
@AdminOnly()
export class OperationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async get() {
    const root = [
      resolve(__dirname, '../../../..'),
      process.cwd(),
      resolve(process.cwd(), '../..'),
    ].find((dir) => existsSync(join(dir, 'pnpm-workspace.yaml')))!;
    const load = async (path: string) => {
      try {
        return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
      } catch {
        return null;
      }
    };
    const [state, supervisor, pending, failed] = await Promise.all([
      load(join(root, '.local/operations/status.json')),
      load(join(root, '.local/run/services.json')),
      this.prisma.academyOutboxEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.academyOutboxEvent.count({ where: { status: 'FAILED' } }),
    ]);
    let alerts: unknown[] = [];
    try {
      alerts = (await readFile(join(root, '.local/operations/alerts.jsonl'), 'utf8'))
        .trim()
        .split('\n')
        .slice(-20)
        .reverse()
        .map((line) => JSON.parse(line));
    } catch {}
    return {
      state,
      supervisor,
      notifications: { pending, failed },
      alerts,
      executions: executionStatus(),
      pythonConfigured: existsSync(env.PYTHON_BIN) && existsSync(env.PYTHON_SANDBOX_BIN),
      mailTransport: env.MAIL_TRANSPORT,
      remoteConfigured: !!process.env.BACKUP_REMOTE,
      alertEmailConfigured: !!process.env.OPERATIONS_ALERT_EMAIL,
    };
  }
}
