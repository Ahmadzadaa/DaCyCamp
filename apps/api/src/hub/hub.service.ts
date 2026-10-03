/**
 * Öyrənmə mərkəzi — sidebar bölmələri üçün məlumat: Fəaliyyətim, Liderlər cədvəli, Təcrübə, İmtahanlar,
 * Layihələr, Yarışlar. Yeni cədvəl yoxdur: hamısı mövcud qeydlərdən (ActivityDay, XpEvent, StepProgress,
 * PathItemProgress, CtfSolve) hesablanır.
 */
import { Injectable } from '@nestjs/common';
import type {
  ActivityDto,
  ContestBoardDto,
  ContestDto,
  ExamsDto,
  LeaderboardDto,
  LeaderboardPeriod,
  PracticeDto,
  ProjectsDto,
  StepType,
} from '@dacy/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { pathInclude, PathsService } from '../paths/paths.service';
import { addDays, dateToDay, dayKey, dayToDate, weekDays } from '../progress/dates';
import { notFound } from '../common/errors';
import { env } from '../config/env';

const PRACTICE_TYPES: StepType[] = ['SQL', 'PYTHON', 'TERMINAL', 'CTF'];

/** APP_TIMEZONE-da verilən günün başlanğıc anı (məs. Bakı B.e 00:00 = B 20:00 UTC) */
export function startOfDayInTz(day: string, tz = env.APP_TIMEZONE): Date {
  const utc = new Date(`${day}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(utc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asLocal = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(utc.getTime() - (asLocal - utc.getTime()));
}
const HEATMAP_DAYS = 53 * 7;

/** «Orxan Rəhimov» → «Orxan R.» (liderlər cədvəlində tam ad göstərilmir) */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

const stepUrl = (courseSlug: string, moduleKey: string, stepKey: string) =>
  `/kurs/${courseSlug}/${moduleKey}/${stepKey}`;

@Injectable()
export class HubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly paths: PathsService,
  ) {}

  // ───────── Fəaliyyətim ─────────
  async activity(userId: string): Promise<ActivityDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound();
    const today = dayKey();
    // heatmap həftənin bazar ertəsindən başlasın
    const firstMonday = weekDays(addDays(today, -(HEATMAP_DAYS - 7)))[0]!;
    const [rows, allActive, events, completed, certs, pathCerts] = await Promise.all([
      this.prisma.activityDay.findMany({
        where: { userId, date: { gte: dayToDate(firstMonday) } },
      }),
      this.prisma.activityDay.findMany({
        where: { userId, stepsCompleted: { gt: 0 } },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      this.prisma.xpEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          step: { include: { module: { include: { course: true } } } },
          ctfTask: { include: { step: { include: { module: { include: { course: true } } } } } },
          course: true,
          pathItem: { include: { path: true, course: true } },
          path: true,
        },
      }),
      this.prisma.stepProgress.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          step: { select: { module: { select: { course: { select: { track: true } } } } } },
        },
      }),
      this.prisma.certificate.count({ where: { userId, revokedAt: null } }),
      this.prisma.pathCertificate.count({ where: { userId, revokedAt: null } }),
    ]);

    const byDay = new Map(rows.map((r) => [dateToDay(r.date), r]));
    const days: ActivityDto['days'] = [];
    for (let d = firstMonday; d <= today; d = addDays(d, 1)) {
      const r = byDay.get(d);
      days.push({ date: d, steps: r?.stepsCompleted ?? 0, xp: r?.xp ?? 0 });
    }

    // seriyalar
    const activeSet = allActive.map((r) => dateToDay(r.date));
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of activeSet) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    const set = new Set(activeSet);
    let current = 0;
    let cursor = set.has(today) ? today : addDays(today, -1);
    while (set.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }

    const tracks = new Map<string, { title: string; color: string; steps: number }>();
    for (const c of completed) {
      const tr = c.step.module.course.track;
      const cur = tracks.get(tr.id) ?? { title: tr.title, color: tr.color, steps: 0 };
      cur.steps++;
      tracks.set(tr.id, cur);
    }

    return {
      days,
      totals: {
        xp: user.xpTotal,
        steps: completed.length,
        activeDays: activeSet.length,
        currentStreak: current,
        bestStreak: best,
        certificates: certs + pathCerts,
      },
      byTrack: [...tracks.values()].sort((a, b) => b.steps - a.steps),
      events: events.map((e) => {
        const step = e.step ?? e.ctfTask?.step ?? null;
        const course = step?.module.course ?? e.course ?? e.pathItem?.course ?? null;
        let title: string | null = null;
        let url: string | null = null;
        if (e.ctfTask && step) {
          title = step.title;
          url =
            course && !course.deletedAt ? stepUrl(course.slug, step.module.key, step.key) : null;
        } else if (step) {
          title = step.title;
          url =
            course && !course.deletedAt ? stepUrl(course.slug, step.module.key, step.key) : null;
        } else if (e.pathItem) {
          title = e.pathItem.title ?? e.pathItem.course?.title ?? e.pathItem.path.title;
          url = `/yol/${e.pathItem.path.slug}/${e.pathItem.key}`;
        } else if (e.path) {
          title = e.path.title;
          url = `/yol/${e.path.slug}`;
        } else if (course) {
          title = course.title;
          url = course.deletedAt ? null : `/kurs/${course.slug}`;
        }
        const context =
          e.pathItem || e.path
            ? (e.pathItem?.path.title ?? e.path?.title ?? null)
            : course && title !== course.title
              ? course.title
              : null;
        return {
          id: e.id,
          at: e.createdAt.toISOString(),
          amount: e.amount,
          reason: e.reason,
          title,
          context,
          url,
        };
      }),
    };
  }

  // ───────── Liderlər cədvəli ─────────
  async leaderboard(period: LeaderboardPeriod, userId: string | null): Promise<LeaderboardDto> {
    const visible = { role: 'STUDENT' as const, showOnLeaderboard: true };
    let ranked: Array<{ id: string; name: string; xp: number }>;
    if (period === 'all') {
      const users = await this.prisma.user.findMany({
        where: { ...visible, xpTotal: { gt: 0 } },
        orderBy: [{ xpTotal: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, xpTotal: true },
      });
      ranked = users.map((u) => ({ id: u.id, name: u.name, xp: u.xpTotal }));
    } else {
      const today = dayKey();
      const from = period === 'week' ? weekDays(today)[0]! : `${today.slice(0, 8)}01`; // ayın 1-i
      const sums = await this.prisma.xpEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startOfDayInTz(from) }, user: visible },
        _sum: { amount: true },
      });
      const users = await this.prisma.user.findMany({
        where: { id: { in: sums.map((s) => s.userId) } },
        select: { id: true, name: true, createdAt: true },
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      ranked = sums
        .map((s) => ({
          id: s.userId,
          name: byId.get(s.userId)?.name ?? '—',
          xp: s._sum.amount ?? 0,
        }))
        .filter((r) => r.xp > 0)
        .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    }

    // eyni XP → eyni yer (1, 2, 2, 4)
    let lastXp: number | null = null;
    let lastRank = 0;
    const rows = ranked.map((r, i) => {
      const rank = r.xp === lastXp ? lastRank : i + 1;
      lastXp = r.xp;
      lastRank = rank;
      return { ...r, rank };
    });

    let me: LeaderboardDto['me'] = null;
    if (userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { showOnLeaderboard: true, role: true, xpTotal: true },
      });
      const mine = rows.find((r) => r.id === userId);
      me = {
        rank: mine?.rank ?? null,
        xp: mine?.xp ?? (period === 'all' ? (u?.xpTotal ?? 0) : 0),
        hidden: !u?.showOnLeaderboard || u.role !== 'STUDENT',
      };
    }
    return {
      period,
      rows: rows.slice(0, 50).map((r) => ({
        rank: r.rank,
        name: shortName(r.name),
        initials: initialsOf(r.name),
        xp: r.xp,
        me: r.id === userId,
      })),
      me,
      participants: rows.length,
    };
  }

  /** Yazıldığı (silinməmiş) kurslar və onların xəritəsi */
  private async myCourseMaps(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, course: { deletedAt: null } },
      orderBy: { lastActivityAt: 'desc' },
      include: { course: { include: { track: true } } },
    });
    const out = [];
    for (const e of enrollments) {
      const shape = await this.progress.loadCourseShape(e.courseId);
      const map = await this.progress.mapFor(userId, shape);
      out.push({ course: e.course, map });
    }
    return out;
  }

  // ───────── Təcrübə ─────────
  async practice(userId: string): Promise<PracticeDto> {
    const maps = await this.myCourseMaps(userId);
    const byType: Partial<Record<StepType, number>> = {};
    let total = 0;
    let done = 0;
    const courses: PracticeDto['courses'] = [];
    for (const { course, map } of maps) {
      const tasks: PracticeDto['courses'][number]['tasks'] = [];
      for (const m of map.modules)
        for (const s of m.steps) {
          if (!PRACTICE_TYPES.includes(s.type)) continue;
          tasks.push({
            id: s.id,
            title: s.title,
            type: s.type,
            xp: s.xp,
            state: s.state,
            attempts: s.attempts,
            moduleTitle: m.title,
            url: stepUrl(course.slug, m.key, s.key),
          });
          byType[s.type] = (byType[s.type] ?? 0) + 1;
          total++;
          if (s.state === 'completed') done++;
        }
      if (tasks.length)
        courses.push({
          slug: course.slug,
          title: course.title,
          trackTitle: course.track.title,
          trackColor: course.track.color,
          trackIcon: course.track.icon,
          tasks,
        });
    }
    return { courses, counts: { total, done, byType } };
  }

  /** Yazıldığı (dərc olunmuş) yollar və onların xəritəsi */
  private async myPathMaps(userId: string) {
    const rows = await this.prisma.pathEnrollment.findMany({
      where: { userId, path: { isPublished: true } },
      orderBy: [{ isActive: 'desc' }, { enrolledAt: 'desc' }],
      include: { path: { include: pathInclude } },
    });
    const out = [];
    for (const r of rows)
      out.push({ path: r.path, ...(await this.paths.buildMap(userId, r.path)) });
    return out;
  }

  // ───────── İmtahanlar ─────────
  async exams(userId: string): Promise<ExamsDto> {
    const [pathMaps, courseMaps] = await Promise.all([
      this.myPathMaps(userId),
      this.myCourseMaps(userId),
    ]);
    const assessments: ExamsDto['assessments'] = [];
    for (const { path, items } of pathMaps)
      for (const it of items) {
        if (it.type !== 'ASSESSMENT') continue;
        const raw = path.items.find((x) => x.id === it.id);
        const cfg = (raw?.config ?? {}) as { pass_score?: number };
        assessments.push({
          id: it.id,
          title: it.title,
          pathSlug: path.slug,
          pathTitle: path.title,
          trackColor: path.track.color,
          state: it.state,
          status: it.progress?.status ?? null,
          score: it.progress?.score ?? null,
          attempts: it.progress?.attempts ?? 0,
          passScore: typeof cfg.pass_score === 'number' ? cfg.pass_score : null,
          xp: it.xp,
          url: it.url,
        });
      }
    const quizzes: ExamsDto['quizzes'] = [];
    for (const { course, map } of courseMaps)
      for (const m of map.modules)
        for (const s of m.steps) {
          if (s.type !== 'QUIZ') continue;
          quizzes.push({
            id: s.id,
            title: s.title,
            courseSlug: course.slug,
            courseTitle: course.title,
            trackColor: course.track.color,
            state: s.state,
            score: s.score,
            attempts: s.attempts,
            xp: s.xp,
            url: stepUrl(course.slug, m.key, s.key),
          });
        }
    return { assessments, quizzes };
  }

  // ───────── Layihələr ─────────
  async projects(userId: string): Promise<ProjectsDto> {
    const pathMaps = await this.myPathMaps(userId);
    const ids = pathMaps.flatMap((p) =>
      p.items.filter((i) => i.type === 'PROJECT').map((i) => i.id),
    );
    const feedback = new Map(
      (
        await this.prisma.pathItemProgress.findMany({
          where: { userId, pathItemId: { in: ids } },
          select: { pathItemId: true, feedback: true },
        })
      ).map((r) => [r.pathItemId, r.feedback]),
    );
    const items: ProjectsDto['items'] = [];
    for (const { path, items: its } of pathMaps)
      for (const it of its) {
        if (it.type !== 'PROJECT') continue;
        const raw = path.items.find((x) => x.id === it.id);
        const cfg = (raw?.config ?? {}) as { review_mode?: string; deliverables?: unknown[] };
        items.push({
          id: it.id,
          title: it.title,
          pathSlug: path.slug,
          pathTitle: path.title,
          trackColor: path.track.color,
          state: it.state,
          status: it.progress?.status ?? null,
          submittedAt: it.progress?.submittedAt ?? null,
          completedAt: it.progress?.completedAt ?? null,
          feedback: feedback.get(it.id) ?? null,
          reviewMode: cfg.review_mode === 'auto' ? 'auto' : 'manual',
          deliverables: Array.isArray(cfg.deliverables) ? cfg.deliverables.length : 0,
          estimatedHours: it.estimatedHours,
          xp: it.xp,
          url: it.url,
        });
      }
    return { items };
  }

  // ───────── Yarışlar (CTF otaqları) ─────────
  private async ctfSteps(stepId?: string) {
    return this.prisma.step.findMany({
      where: {
        ...(stepId ? { id: stepId } : {}),
        type: 'CTF',
        isPublished: true,
        module: {
          isPublished: true,
          course: { isPublished: true, deletedAt: null, archivedAt: null },
        },
      },
      include: {
        module: { include: { course: { include: { track: true } } } },
        ctfTasks: { select: { id: true, points: true } },
      },
      orderBy: [{ module: { course: { title: 'asc' } } }, { order: 'asc' }],
    });
  }

  async contests(userId: string | null): Promise<ContestDto[]> {
    const steps = await this.ctfSteps();
    const taskIds = steps.flatMap((s) => s.ctfTasks.map((t) => t.id));
    const [solves, enrollments] = await Promise.all([
      this.prisma.ctfSolve.findMany({
        where: { ctfTaskId: { in: taskIds } },
        select: { userId: true, ctfTaskId: true },
      }),
      userId
        ? this.prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } })
        : Promise.resolve([]),
    ]);
    const enrolled = new Set(enrollments.map((e) => e.courseId));
    return steps
      .filter((s) => s.ctfTasks.length > 0)
      .map((s) => this.toContest(s, solves, userId, enrolled));
  }

  private toContest(
    s: Awaited<ReturnType<HubService['ctfSteps']>>[number],
    solves: Array<{ userId: string; ctfTaskId: string }>,
    userId: string | null,
    enrolled: Set<string>,
  ): ContestDto {
    const course = s.module.course;
    const points = new Map(s.ctfTasks.map((t) => [t.id, t.points]));
    const mineSolved = solves.filter((x) => points.has(x.ctfTaskId));
    const perUser = new Map<string, number>();
    for (const x of mineSolved) perUser.set(x.userId, (perUser.get(x.userId) ?? 0) + 1);
    const my = userId ? mineSolved.filter((x) => x.userId === userId) : [];
    const isEnrolled = enrolled.has(course.id);
    return {
      stepId: s.id,
      title: s.title,
      courseSlug: course.slug,
      courseTitle: course.title,
      trackTitle: course.track.title,
      trackColor: course.track.color,
      trackIcon: course.track.icon,
      tasks: s.ctfTasks.length,
      points: s.ctfTasks.reduce((n, t) => n + t.points, 0),
      participants: perUser.size,
      finishers: [...perUser.values()].filter((n) => n >= s.ctfTasks.length).length,
      mine: userId
        ? { solved: my.length, points: my.reduce((n, x) => n + (points.get(x.ctfTaskId) ?? 0), 0) }
        : null,
      enrolled: isEnrolled,
      url: isEnrolled ? stepUrl(course.slug, s.module.key, s.key) : `/kurs/${course.slug}`,
    };
  }

  async contestBoard(stepId: string, userId: string | null): Promise<ContestBoardDto> {
    const [step] = await this.ctfSteps(stepId);
    if (!step || step.ctfTasks.length === 0) throw notFound();
    const points = new Map(step.ctfTasks.map((t) => [t.id, t.points]));
    const [solves, enrollments] = await Promise.all([
      this.prisma.ctfSolve.findMany({
        where: { ctfTaskId: { in: [...points.keys()] } },
        include: { user: { select: { id: true, name: true, showOnLeaderboard: true } } },
      }),
      userId
        ? this.prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } })
        : Promise.resolve([]),
    ]);
    const contest = this.toContest(
      step,
      solves.map((s) => ({ userId: s.userId, ctfTaskId: s.ctfTaskId })),
      userId,
      new Set(enrollments.map((e) => e.courseId)),
    );
    const agg = new Map<string, { name: string; solved: number; points: number; last: Date }>();
    for (const s of solves) {
      if (!s.user.showOnLeaderboard && s.userId !== userId) continue;
      const cur = agg.get(s.userId) ?? {
        name: s.user.name,
        solved: 0,
        points: 0,
        last: s.solvedAt,
      };
      cur.solved++;
      cur.points += points.get(s.ctfTaskId) ?? 0;
      if (s.solvedAt > cur.last) cur.last = s.solvedAt;
      agg.set(s.userId, cur);
    }
    const rows = [...agg.entries()]
      .sort(
        ([, a], [, b]) =>
          b.points - a.points || b.solved - a.solved || a.last.getTime() - b.last.getTime(),
      )
      .slice(0, 50)
      .map(([id, r], i) => ({
        rank: i + 1,
        name: shortName(r.name),
        initials: initialsOf(r.name),
        solved: r.solved,
        points: r.points,
        lastSolveAt: r.last.toISOString(),
        me: id === userId,
      }));
    return { contest, rows };
  }
}
