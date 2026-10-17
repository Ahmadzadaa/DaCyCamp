import { Injectable } from '@nestjs/common';
import type { AcademyEvaluationTrust, StepType } from '@dacy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { trustOf } from './content.adapter';

export interface StepEvidence {
  stepId: string;
  /** platforma qaydası ilə keçilib */
  passed: boolean;
  /** 0..1 — elementin balı = maksimum × nisbət */
  ratio: number;
  /** istinad olunan mövcud Submission (QUIZ/SQL/PYTHON/TERMINAL) */
  learningSubmissionId: string | null;
  at: Date | null;
  trust: AcademyEvaluationTrust;
  /** ümumiyyətlə cəhd olubmu */
  attempted: boolean;
}

/** Təkrar cəhd edilə bilən növlər: sübut tapşırığın açılışından sonra olmalıdır */
const REPEATABLE: ReadonlySet<StepType> = new Set(['QUIZ', 'SQL', 'PYTHON', 'TERMINAL']);

/**
 * Qiymətləndirmə adapteri: mövcud öyrənmə mühərrikinin nəticələrini OXUYUR (yenidən qiymətləndirmir).
 * Hər sorğu tələbənin öz qeydləri ilə məhdudlaşır (userId filtri) — başqasının nəticəsi istifadə oluna bilməz;
 * müştəridən gələn bal heç vaxt qəbul olunmur.
 *
 * Pəncərə: təkrar cəhd edilə bilən növlərdə (test, SQL, Python, terminal) nəticə [availableAt, until] aralığında
 * olmalıdır — tapşırıqdan əvvəlki həll yenidən istifadə olunmur. Bir dəfəlik növlər (nəzəri dərsin tamamlanması,
 * CTF həlləri) yenidən edilə bilmədiyi üçün istənilən vaxt qəbul olunur.
 */
@Injectable()
export class AcademyEvaluationAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async evidence(
    studentId: string,
    steps: ReadonlyArray<{ stepId: string; type: StepType }>,
    since: Date,
    until: Date,
  ): Promise<Map<string, StepEvidence>> {
    const out = new Map<string, StepEvidence>();
    const repeatable = steps.filter((s) => REPEATABLE.has(s.type)).map((s) => s.stepId);
    const theory = steps.filter((s) => s.type === 'THEORY').map((s) => s.stepId);
    const ctf = steps.filter((s) => s.type === 'CTF').map((s) => s.stepId);

    const [subs, progress, tasks, solves] = await Promise.all([
      repeatable.length
        ? this.prisma.submission.findMany({
            where: {
              userId: studentId,
              stepId: { in: repeatable },
              createdAt: { gte: since, lte: until },
            },
            select: {
              id: true,
              stepId: true,
              passed: true,
              score: true,
              createdAt: true,
              type: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      theory.length
        ? this.prisma.stepProgress.findMany({
            where: { userId: studentId, stepId: { in: theory }, status: 'COMPLETED' },
            select: { stepId: true, completedAt: true },
          })
        : [],
      ctf.length
        ? this.prisma.ctfTask.findMany({
            where: { stepId: { in: ctf } },
            select: { id: true, stepId: true, points: true },
          })
        : [],
      ctf.length
        ? this.prisma.ctfSolve.findMany({
            where: {
              userId: studentId,
              ctfTask: { stepId: { in: ctf } },
              solvedAt: { lte: until },
            },
            select: { ctfTaskId: true, solvedAt: true },
          })
        : [],
    ]);

    for (const s of steps) {
      const trust = trustOf(s.type);
      if (REPEATABLE.has(s.type)) {
        const mine = subs.filter((x) => x.stepId === s.stepId);
        if (s.type === 'QUIZ') {
          // test: pəncərədəki ən yüksək faiz (qismən bal), keçid — platformanın keçid həddi
          const best = mine.reduce<(typeof mine)[number] | null>(
            (b, x) => (b === null || (x.score ?? 0) > (b.score ?? 0) ? x : b),
            null,
          );
          out.set(s.stepId, {
            stepId: s.stepId,
            passed: !!best?.passed || mine.some((x) => x.passed),
            ratio: best ? Math.min(1, Math.max(0, (best.score ?? 0) / 100)) : 0,
            learningSubmissionId: best?.id ?? null,
            at: best?.createdAt ?? null,
            trust,
            attempted: mine.length > 0,
          });
        } else {
          const pass = mine.find((x) => x.passed); // ən son keçən nəticə (desc sıralama)
          out.set(s.stepId, {
            stepId: s.stepId,
            passed: !!pass,
            ratio: pass ? 1 : 0,
            learningSubmissionId: pass?.id ?? mine[0]?.id ?? null,
            at: pass?.createdAt ?? mine[0]?.createdAt ?? null,
            trust,
            attempted: mine.length > 0,
          });
        }
      } else if (s.type === 'THEORY') {
        const p = progress.find((x) => x.stepId === s.stepId);
        out.set(s.stepId, {
          stepId: s.stepId,
          passed: !!p,
          ratio: p ? 1 : 0,
          learningSubmissionId: null,
          at: p?.completedAt ?? null,
          trust,
          attempted: !!p,
        });
      } else if (s.type === 'CTF') {
        const mineTasks = tasks.filter((t) => t.stepId === s.stepId);
        const solved = solves.filter((x) => mineTasks.some((t) => t.id === x.ctfTaskId));
        const totalPts = mineTasks.reduce((a, t) => a + t.points, 0);
        const ratio = mineTasks.length
          ? totalPts > 0
            ? solved.reduce(
                (a, x) => a + (mineTasks.find((t) => t.id === x.ctfTaskId)?.points ?? 0),
                0,
              ) / totalPts
            : solved.length / mineTasks.length
          : 0;
        const last = solved.reduce<Date | null>(
          (d, x) => (!d || x.solvedAt > d ? x.solvedAt : d),
          null,
        );
        out.set(s.stepId, {
          stepId: s.stepId,
          passed: mineTasks.length > 0 && solved.length === mineTasks.length,
          ratio,
          learningSubmissionId: null,
          at: last,
          trust,
          attempted: solved.length > 0,
        });
      }
    }
    return out;
  }
}
