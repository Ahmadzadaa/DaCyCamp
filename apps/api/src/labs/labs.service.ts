import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { LabSession, Step } from '@prisma/client';
import {
  DEFAULT_LAB_MINUTES,
  type AdminLabSessionDto,
  type LabCheckResultDto,
  type LabSessionDto,
  type LabTicketDto,
} from '@dacy/shared';
import { env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { readFromStorage } from '../assets/storage';
import { ApiException, badRequest, forbidden, notFound } from '../common/errors';
import type { LabDriver, LabTerminal } from './driver';
import { LabDriverError } from './driver';
import { DockerDriver } from './docker.driver';
import { MockDriver } from './mock.driver';
import { signTicket, verifyTicket } from './ticket';

const ACTIVE = ['STARTING', 'RUNNING'] as const;
const ATTACHABLE = ['RUNNING', 'PASSED'] as const;

type LabConfig = { docker_image?: string; time_limit_minutes?: number; network?: boolean };

/** Terminal lab sessiyaları: konteyner həyat dövrü, yoxlama, biletlər, vaxtı bitənlərin təmizlənməsi */
@Injectable()
export class LabsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Labs');
  readonly driver: LabDriver | null;
  private reaper: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {
    this.driver =
      env.LAB_DRIVER === 'off'
        ? null
        : env.LAB_DRIVER === 'mock'
          ? new MockDriver()
          : new DockerDriver({ pull: env.LAB_PULL, socketPath: env.DOCKER_SOCKET });
  }

  onModuleInit() {
    if (env.NODE_ENV !== 'test' && this.driver) {
      this.reaper = setInterval(() => void this.reap(), 30_000);
      this.reaper.unref?.();
      void this.reap();
    }
  }

  onModuleDestroy() {
    if (this.reaper) clearInterval(this.reaper);
  }

  // ───────────────────────── tələbə

  async current(userId: string, stepId: string): Promise<LabSessionDto | null> {
    const s = await this.prisma.labSession.findFirst({
      where: { userId, stepId },
      orderBy: { startedAt: 'desc' },
    });
    return s ? this.toDto(s) : null;
  }

  async start(
    userId: string,
    stepId: string,
    opts: { reset?: boolean; preview: boolean },
  ): Promise<LabSessionDto> {
    const driver = this.requireDriver();
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { module: { select: { courseId: true } } },
    });
    if (!step) throw notFound();
    const cfg = (step.config ?? {}) as LabConfig;
    const isLab = step.type === 'TERMINAL' || (step.type === 'CTF' && !!cfg.docker_image);
    if (!isLab) throw badRequest('WRONG_STEP_TYPE');
    if (!cfg.docker_image) throw badRequest('LAB_IMAGE_MISSING', 'Docker imici təyin olunmayıb');
    if (!opts.preview) await this.assertUnlocked(userId, step.id, step.module.courseId);

    const active = await this.prisma.labSession.findFirst({
      where: {
        userId,
        stepId,
        status: { in: [...ACTIVE, 'PASSED'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (active && !opts.reset) return this.toDto(active);
    if (active) await this.end(active, 'STOPPED');

    const running = await this.prisma.labSession.count({
      where: { status: { in: [...ACTIVE, 'PASSED'] }, expiresAt: { gt: new Date() } },
    });
    if (running >= env.LAB_MAX_SESSIONS)
      throw new ApiException('LAB_LIMIT', 429, 'Hal-hazırda çox lab işləyir');
    if (!(await driver.available()))
      throw new ApiException('LAB_UNAVAILABLE', 503, 'Docker daemon əlçatan deyil');

    const minutes = cfg.time_limit_minutes ?? DEFAULT_LAB_MINUTES;
    const session = await this.prisma.labSession.create({
      data: {
        userId,
        stepId,
        status: 'STARTING',
        image: cfg.docker_image,
        expiresAt: new Date(Date.now() + minutes * 60_000),
      },
    });
    const checkScript = step.type === 'TERMINAL' ? await this.loadCheckScript(step) : null;
    void this.provision(session.id, {
      image: cfg.docker_image,
      network: cfg.network ?? false,
      userId,
      checkScript,
    });
    return this.toDto(session);
  }

  async stop(userId: string, id: string): Promise<LabSessionDto> {
    const s = await this.own(userId, id);
    if ((ACTIVE as readonly string[]).includes(s.status) || s.status === 'PASSED') {
      return this.toDto(await this.end(s, s.status === 'PASSED' ? 'PASSED' : 'STOPPED'));
    }
    return this.toDto(s);
  }

  async check(userId: string, id: string, preview: boolean): Promise<LabCheckResultDto> {
    const driver = this.requireDriver();
    const s = await this.own(userId, id);
    if (s.status !== 'RUNNING' || !s.containerId) throw badRequest('LAB_NOT_RUNNING');
    const step = await this.prisma.step.findUniqueOrThrow({ where: { id: s.stepId } });
    const secret = (step.secret ?? {}) as { check_script?: string };
    if (step.type !== 'TERMINAL' || !secret.check_script) throw badRequest('LAB_NOT_APPLICABLE');
    const r = await driver.runCheck(s.containerId, env.LAB_CHECK_TIMEOUT_SEC * 1000);
    const passed = r.exitCode === 0;
    const now = new Date();
    await this.prisma.labSession.update({
      where: { id },
      data: {
        checkOutput: r.output.slice(0, 4000),
        ...(passed ? { status: 'PASSED', passedAt: now } : {}),
      },
    });
    let complete = null;
    if (passed) {
      if (!preview)
        complete = await this.progress.completeStep(userId, s.stepId, { attemptsDelta: 1 });
    } else if (!preview) {
      await this.progress.recordAttempt(userId, s.stepId, null);
    }
    return { passed, exitCode: r.exitCode, output: r.output, timedOut: r.timedOut, complete };
  }

  async ticket(userId: string, id: string): Promise<LabTicketDto> {
    const s = await this.own(userId, id);
    if (!(ATTACHABLE as readonly string[]).includes(s.status) || !s.containerId)
      throw badRequest('LAB_NOT_RUNNING');
    return {
      token: signTicket(env.JWT_ACCESS_SECRET, { sid: id, uid: userId }, 60),
      path: '/labs/ws',
    };
  }

  /** WebSocket: biletlə qoşulma → konteyner terminalı */
  async attachByTicket(token: string, size: { cols: number; rows: number }): Promise<LabTerminal> {
    const driver = this.requireDriver();
    const t = verifyTicket(env.JWT_ACCESS_SECRET, token);
    if (!t) throw forbidden('AUTH_REQUIRED', 'Bilet etibarsızdır');
    const s = await this.prisma.labSession.findUnique({ where: { id: t.sid } });
    if (!s || s.userId !== t.uid) throw forbidden('AUTH_FORBIDDEN');
    if (!(ATTACHABLE as readonly string[]).includes(s.status) || !s.containerId)
      throw badRequest('LAB_NOT_RUNNING');
    if (s.expiresAt.getTime() < Date.now()) throw badRequest('LAB_NOT_RUNNING', 'Vaxt bitib');
    return driver.attach(s.containerId, size);
  }

  // ───────────────────────── admin

  async listActive(): Promise<AdminLabSessionDto[]> {
    const rows = await this.prisma.labSession.findMany({
      where: { status: { in: [...ACTIVE, 'PASSED'] }, expiresAt: { gt: new Date() } },
      orderBy: { startedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        step: {
          select: {
            id: true,
            title: true,
            module: { select: { course: { select: { slug: true, title: true } } } },
          },
        },
      },
    });
    return rows.map((r) => ({
      ...this.toDto(r),
      user: r.user,
      step: {
        id: r.step.id,
        title: r.step.title,
        courseSlug: r.step.module.course.slug,
        courseTitle: r.step.module.course.title,
      },
      containerId: r.containerId,
    }));
  }

  async adminStop(id: string): Promise<LabSessionDto> {
    const s = await this.prisma.labSession.findUnique({ where: { id } });
    if (!s) throw notFound();
    return this.toDto(await this.end(s, s.status === 'PASSED' ? 'PASSED' : 'STOPPED'));
  }

  /** Vaxtı bitən sessiyaların konteynerlərini sil; sürücüdəki yetim konteynerləri təmizlə */
  async reap() {
    if (!this.driver) return;
    const now = new Date();
    const expired = await this.prisma.labSession.findMany({
      where: {
        OR: [
          { status: { in: [...ACTIVE] }, expiresAt: { lt: now } },
          { status: 'PASSED', expiresAt: { lt: now }, endedAt: null },
        ],
      },
    });
    for (const s of expired) {
      await this.end(s, s.status === 'PASSED' ? 'PASSED' : 'EXPIRED').catch((e) =>
        this.log.warn(`Lab ${s.id} təmizlənmədi: ${(e as Error).message}`),
      );
    }
    try {
      const managed = await this.driver.listManaged();
      // konteyneri sürücüdə olmayan (API yenidən başlayıb / konteyner kənardan silinib) canlı sessiyalar → STOPPED
      const known = new Set(managed.map((m) => m.id));
      const live = await this.prisma.labSession.findMany({
        where: { status: { in: ['RUNNING', 'PASSED'] }, endedAt: null, containerId: { not: null } },
      });
      for (const s of live) {
        if (!known.has(s.containerId!)) {
          this.log.log(`Konteyneri olmayan sessiya bağlanır: ${s.id}`);
          await this.prisma.labSession.update({
            where: { id: s.id },
            data: {
              status: s.status === 'PASSED' ? 'PASSED' : 'STOPPED',
              endedAt: now,
              containerId: null,
            },
          });
        }
      }
      if (!managed.length) return;
      const alive = new Set(
        (
          await this.prisma.labSession.findMany({
            where: {
              id: { in: managed.map((m) => m.sessionId).filter((x): x is string => !!x) },
              endedAt: null,
            },
            select: { id: true },
          })
        ).map((x) => x.id),
      );
      for (const m of managed) {
        if (!m.sessionId || !alive.has(m.sessionId)) {
          this.log.log(`Yetim lab konteyneri silinir: ${m.id.slice(0, 12)}`);
          await this.driver.destroy(m.id).catch(() => undefined);
        }
      }
    } catch (e) {
      this.log.warn(`Yetim təmizliyi alınmadı: ${(e as Error).message}`);
    }
  }

  // ───────────────────────── daxili

  private requireDriver(): LabDriver {
    if (!this.driver) throw new ApiException('LAB_UNAVAILABLE', 503, 'Lab mühiti söndürülüb');
    return this.driver;
  }

  private async own(userId: string, id: string) {
    const s = await this.prisma.labSession.findUnique({ where: { id } });
    if (!s || s.userId !== userId) throw notFound();
    return s;
  }

  private async assertUnlocked(userId: string, stepId: string, courseId: string) {
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) throw forbidden('NOT_ENROLLED', 'Əvvəlcə kursa yazılın');
    const course = await this.progress.loadCourseShape(courseId);
    const map = await this.progress.mapFor(userId, course);
    const s = map.flat.find((x) => x.id === stepId);
    if (!s) throw notFound();
    if (s.state === 'locked') throw forbidden('STEP_LOCKED', 'Bu addım kilidlidir');
  }

  private async loadCheckScript(
    step: Step & { module: { courseId: string } },
  ): Promise<string | null> {
    const secret = (step.secret ?? {}) as { check_script?: string };
    if (!secret.check_script) return null;
    const asset = await this.prisma.asset.findUnique({
      where: { courseId_path: { courseId: step.module.courseId, path: secret.check_script } },
    });
    if (!asset) return null;
    const buf = await readFromStorage(asset.storageKey);
    return buf.toString('utf8');
  }

  private async provision(
    sessionId: string,
    o: { image: string; network: boolean; userId: string; checkScript: string | null },
  ) {
    const driver = this.driver!;
    let containerId: string | null = null;
    try {
      containerId = await driver.create({
        image: o.image,
        sessionId,
        userId: o.userId,
        network: o.network,
        memoryMb: env.LAB_MEMORY_MB,
        cpus: env.LAB_CPUS,
        pidsLimit: env.LAB_PIDS_LIMIT,
      });
      await driver.prepare(containerId, { checkScript: o.checkScript });
      const cur = await this.prisma.labSession.findUnique({ where: { id: sessionId } });
      if (!cur || cur.status !== 'STARTING') {
        await driver.destroy(containerId);
        return;
      }
      await this.prisma.labSession.update({
        where: { id: sessionId },
        data: { status: 'RUNNING', containerId },
      });
    } catch (e) {
      const msg =
        e instanceof LabDriverError ? e.message : `Konteyner yaradılmadı: ${(e as Error).message}`;
      this.log.warn(`Lab ${sessionId} başlamadı: ${msg}`);
      if (containerId) await driver.destroy(containerId).catch(() => undefined);
      await this.prisma.labSession
        .update({
          where: { id: sessionId },
          data: { status: 'FAILED', endedAt: new Date(), checkOutput: msg.slice(0, 1000) },
        })
        .catch(() => undefined);
    }
  }

  private async end(s: LabSession, status: 'STOPPED' | 'EXPIRED' | 'PASSED') {
    if (s.containerId && this.driver) {
      await this.driver
        .destroy(s.containerId)
        .catch((e) =>
          this.log.warn(`Konteyner silinmədi (${s.containerId}): ${(e as Error).message}`),
        );
    }
    return this.prisma.labSession.update({
      where: { id: s.id },
      data: { status, endedAt: new Date(), containerId: null },
    });
  }

  private toDto(s: LabSession): LabSessionDto {
    const remaining = Math.max(0, Math.floor((s.expiresAt.getTime() - Date.now()) / 1000));
    const live =
      (ACTIVE as readonly string[]).includes(s.status) || (s.status === 'PASSED' && !s.endedAt);
    return {
      id: s.id,
      stepId: s.stepId,
      status: s.status,
      image: s.image,
      startedAt: s.startedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      passedAt: s.passedAt?.toISOString() ?? null,
      remainingSec: live ? remaining : 0,
      message: s.checkOutput,
      driver: this.driver?.kind ?? 'mock',
    };
  }
}
