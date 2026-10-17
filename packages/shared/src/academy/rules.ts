// Akademiyanın saf biznes qaydaları (server həlledicidir; web eyni qaydalarla göstərir).
import type {
  AcademyAttemptSelection,
  AcademyGradeStatus,
  AcademyLatePolicy,
  AcademyStudentStatus,
} from './enums';

// ───────────────────────── ballar: yüzdə bir bal (tam ədəd) ─────────────────────────

/**
 * Bal → yüzdə birlər (tam ədəd). Yuvarlaqlaşdırma: 2 onluğa qədər, yarım yuxarı.
 * `toFixed(6)` float qalıqlarını təmizləyir: 1.005 × 100 = 100.49999… → 100.5 → 101.
 */
export function toCenti(points: number): number {
  if (!Number.isFinite(points)) throw new RangeError('score must be finite');
  return Math.round(Number((points * 100).toFixed(6)));
}
export const fromCenti = (centi: number): number => centi / 100;

export class ScoreError extends Error {
  constructor(
    public readonly code:
      | 'SCORE_OUT_OF_RANGE'
      | 'SCORE_TOTAL_MISMATCH'
      | 'RUBRIC_TOTAL_MISMATCH'
      | 'ATTEMPT_NOT_FOUND',
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** 0 ≤ bal ≤ maksimum (hər ikisi yüzdə birlərlə) */
export function assertScoreInRange(scoreCenti: number, maxCenti: number): void {
  if (!Number.isInteger(scoreCenti) || scoreCenti < 0 || scoreCenti > maxCenti)
    throw new ScoreError('SCORE_OUT_OF_RANGE');
}

/** Tapşırığın maksimum balı balla qiymətləndirilən elementlərin maksimumlarının cəminə bərabər olmalıdır */
export function sumItemMax(items: ReadonlyArray<{ maxScoreCenti: number }>): number {
  return items.reduce((s, i) => s + i.maxScoreCenti, 0);
}

/** Rubrika: hər meyar > 0, meyarların cəmi rubrikanın maksimumuna bərabər */
export function assertRubricTotal(
  criteria: ReadonlyArray<{ maxScoreCenti: number }>,
  rubricMaxCenti: number,
): void {
  if (criteria.length === 0 || criteria.some((c) => !Number.isInteger(c.maxScoreCenti) || c.maxScoreCenti <= 0))
    throw new ScoreError('SCORE_OUT_OF_RANGE');
  if (sumItemMax(criteria) !== rubricMaxCenti) throw new ScoreError('RUBRIC_TOTAL_MISMATCH');
}

/**
 * Gecikmə cəriməsi xam balın faizidir (maksimumun yox): round_half_up(raw × p / 100).
 * Yekun = max(0, xam − cərimə). Cərimə yalnız ACCEPT_WITH_PENALTY və gecikmiş cəhd üçün.
 */
export function computeFinalScore(input: {
  rawCenti: number;
  maxCenti: number;
  isLate: boolean;
  latePolicy: AcademyLatePolicy;
  latePenaltyPercent: number;
}): { rawCenti: number; penaltyCenti: number; finalCenti: number } {
  assertScoreInRange(input.rawCenti, input.maxCenti);
  const p =
    input.isLate && input.latePolicy === 'ACCEPT_WITH_PENALTY'
      ? Math.min(100, Math.max(0, Math.trunc(input.latePenaltyPercent)))
      : 0;
  const penaltyCenti = Math.floor((input.rawCenti * p + 50) / 100);
  return {
    rawCenti: input.rawCenti,
    penaltyCenti,
    finalCenti: Math.max(0, input.rawCenti - penaltyCenti),
  };
}

// ───────────────────────── son tarixlər ─────────────────────────

export interface DeadlineInput {
  /** etibarlı server vaxtı */
  now: Date;
  availableAt: Date;
  dueAt: Date;
  /** fərdi uzadılma (varsa) */
  extendedDueAt?: Date | null;
  latePolicy: AcademyLatePolicy;
  /** gecikmiş göndərişlərin son həddi (varsa) */
  lateCutoffAt?: Date | null;
}

export type WindowDecision =
  | { allowed: true; late: boolean; effectiveDueAt: Date }
  | {
      allowed: false;
      reason: 'NOT_OPEN' | 'DEADLINE_PASSED' | 'CUTOFF_PASSED';
      effectiveDueAt: Date;
    };

/** Effektiv son tarix: etibarlı fərdi uzadılma varsa o, yoxsa ümumi son tarix */
export function effectiveDueAt(dueAt: Date, extendedDueAt?: Date | null): Date {
  return extendedDueAt && extendedDueAt.getTime() > dueAt.getTime() ? extendedDueAt : dueAt;
}

/** Gecikmə həddi uzadılmadan əvvəl qalmasın: max(cutoff, effektiv son tarix) */
export function effectiveCutoffAt(
  lateCutoffAt: Date | null | undefined,
  effDue: Date,
): Date | null {
  if (!lateCutoffAt) return null;
  return lateCutoffAt.getTime() >= effDue.getTime() ? lateCutoffAt : effDue;
}

/**
 * Göndəriş pəncərəsi (sərhəd qaydası hər yerdə eynidir):
 * now < availableAt → bağlıdır; now ≤ effektiv son tarix → vaxtında; sonra gecikmə siyasəti.
 */
export function evaluateSubmissionWindow(i: DeadlineInput): WindowDecision {
  const eff = effectiveDueAt(i.dueAt, i.extendedDueAt);
  const now = i.now.getTime();
  if (now < i.availableAt.getTime())
    return { allowed: false, reason: 'NOT_OPEN', effectiveDueAt: eff };
  if (now <= eff.getTime()) return { allowed: true, late: false, effectiveDueAt: eff };
  if (i.latePolicy === 'REJECT')
    return { allowed: false, reason: 'DEADLINE_PASSED', effectiveDueAt: eff };
  const cutoff = effectiveCutoffAt(i.lateCutoffAt, eff);
  if (cutoff && now > cutoff.getTime())
    return { allowed: false, reason: 'CUTOFF_PASSED', effectiveDueAt: eff };
  return { allowed: true, late: true, effectiveDueAt: eff };
}

// ───────────────────────── cəhdin seçilməsi ─────────────────────────

export interface AttemptLike {
  id: string;
  attemptNumber: number;
  autoScoreCenti: number | null;
}

/**
 * Yekun qiymət üçün cəhd: LATEST_ATTEMPT (defolt) — son cəhd; HIGHEST_SCORE — ən yüksək avtomatik bal
 * (bərabərlikdə sonuncu); INSTRUCTOR_SELECTED — müəllimin seçdiyi (bu göndərişin cəhdi olmalıdır).
 */
export function selectAttempt<T extends AttemptLike>(
  attempts: readonly T[],
  policy: AcademyAttemptSelection,
  selectedId?: string | null,
): T | null {
  if (attempts.length === 0) return null;
  const byNumber = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
  if (selectedId) {
    const s = attempts.find((a) => a.id === selectedId);
    if (!s) throw new ScoreError('ATTEMPT_NOT_FOUND');
    return s;
  }
  if (policy === 'HIGHEST_SCORE') {
    let best = byNumber[0]!;
    for (const a of byNumber) if ((a.autoScoreCenti ?? -1) >= (best.autoScoreCenti ?? -1)) best = a;
    return best;
  }
  return byNumber[byNumber.length - 1]!;
}

/**
 * Cəhd limiti: istifadə olunan cəhdlər maksimuma çatıbsa yeni cəhd yoxdur. İstisna: müəllim göndərişi
 * qaytarıbsa (RETURNED) və tələbə ondan sonra hələ göndərməyibsə — bir düzəliş cəhdinə icazə verilir.
 */
export function attemptLimitReached(i: {
  attemptsUsed: number;
  maxAttempts: number;
  returnedAwaitingResubmission: boolean;
}): boolean {
  if (i.returnedAwaitingResubmission) return false;
  return i.attemptsUsed >= i.maxAttempts;
}

/** Elementin avtomatik balı: maksimum × nisbət (0..1), sentlərlə yuvarlaq, [0, max] aralığında */
export function scaleScore(maxCenti: number, ratio: number): number {
  const r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return Math.min(maxCenti, Math.max(0, Math.round(maxCenti * r)));
}

// ───────────────────────── tələbə vəziyyəti ─────────────────────────

export interface StudentStatusInput extends DeadlineInput {
  attemptCount: number;
  latestAttemptLate: boolean;
  latestAttemptAt: Date | null;
  hasDraft: boolean;
  grade: { status: AcademyGradeStatus; updatedAt: Date } | null;
  /** tapşırıq ləğv / arxiv olunub — yeni göndəriş yoxdur */
  closed?: boolean;
}

/**
 * Törədilən vəziyyət. Göndərişi olmayan, amma hələ açılmamış tapşırıq MISSED sayılmır (NOT_OPEN).
 * MISSED — yalnız göndəriş artıq mümkün deyilsə. `overdue` — son tarix keçib, gecikmiş göndəriş hələ mümkündür.
 */
export function deriveStudentStatus(i: StudentStatusInput): {
  status: AcademyStudentStatus;
  overdue: boolean;
  canSubmit: boolean;
} {
  const w = evaluateSubmissionWindow(i);
  const canSubmitByTime = w.allowed && !i.closed;
  if (i.attemptCount === 0) {
    if (!w.allowed && w.reason === 'NOT_OPEN')
      return { status: 'NOT_OPEN', overdue: false, canSubmit: false };
    if (!canSubmitByTime) return { status: 'MISSED', overdue: false, canSubmit: false };
    const overdue = w.allowed && w.late;
    return { status: i.hasDraft ? 'IN_PROGRESS' : 'NOT_STARTED', overdue, canSubmit: true };
  }
  const g = i.grade;
  // qaytarılandan sonra yeni cəhd → yenidən «göndərilib»
  const resubmittedAfterReturn =
    g?.status === 'RETURNED' && i.latestAttemptAt && i.latestAttemptAt > g.updatedAt;
  if (g?.status === 'RELEASED') return { status: 'GRADED', overdue: false, canSubmit: false };
  if (g?.status === 'RETURNED' && !resubmittedAfterReturn)
    return { status: 'RETURNED', overdue: false, canSubmit: canSubmitByTime };
  if (g?.status === 'DRAFT') return { status: 'UNDER_REVIEW', overdue: false, canSubmit: canSubmitByTime };
  return {
    status: i.latestAttemptLate ? 'SUBMITTED_LATE' : 'SUBMITTED',
    overdue: false,
    canSubmit: canSubmitByTime,
  };
}

// ───────────────────────── vaxt zonası ─────────────────────────

/** Vaxt zonası adı etibarlıdırmı (Intl ilə) */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/** Verilən an üçün zonanın UTC fərqi (dəqiqə) */
function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Zonadakı yerli tarix + saat («2026-10-20», «19:00») → UTC anı (yay vaxtı keçidləri də nəzərə alınır) */
export function zonedLocalToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let utc = guess - off * 60_000;
  const off2 = tzOffsetMinutes(new Date(utc), tz);
  if (off2 !== off) {
    off = off2;
    utc = guess - off * 60_000;
  }
  return new Date(utc);
}

/** UTC anının zonadakı təqvim günü və həftə günü (1 = B.e … 7 = Bazar) */
export function zonedDayInfo(at: Date, tz: string): { date: string; weekday: number } {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { date, weekday: wd === 0 ? 7 : wd };
}

/**
 * Təkrarlanan dərs cədvəli: [startDate, endDate] aralığında seçilmiş həftə günləri üçün dərslər (UTC).
 * Hər dərs ayrıca sətirdir — birini köçürmək digərlərinə təsir etmir.
 */
export function expandWeeklySchedule(i: {
  startDate: string;
  endDate: string;
  weekdays: readonly number[];
  startTime: string;
  durationMinutes: number;
  timezone: string;
  maxSessions?: number;
}): Array<{ startsAt: Date; endsAt: Date }> {
  const out: Array<{ startsAt: Date; endsAt: Date }> = [];
  const days = new Set(i.weekdays);
  const max = i.maxSessions ?? 200;
  const cur = new Date(`${i.startDate}T00:00:00Z`);
  const end = new Date(`${i.endDate}T00:00:00Z`);
  while (cur.getTime() <= end.getTime() && out.length < max) {
    const iso = cur.toISOString().slice(0, 10);
    const wd = cur.getUTCDay() === 0 ? 7 : cur.getUTCDay();
    if (days.has(wd)) {
      const startsAt = zonedLocalToUtc(iso, i.startTime, i.timezone);
      out.push({ startsAt, endsAt: new Date(startsAt.getTime() + i.durationMinutes * 60_000) });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

// ───────────────────────── analitika ─────────────────────────

/** Faiz (0–100, bir onluq); məxrəc 0-dırsa null — «məlumat yoxdur», 0 % deyil */
export function percent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Davamiyyət: (iştirak + gecikmə) / (qeyd olunanlar − üzrlü) × 100 */
export function attendanceRate(c: {
  present: number;
  late: number;
  absent: number;
  excused: number;
}): number | null {
  return percent(c.present + c.late, c.present + c.late + c.absent);
}

/** Müəllimə köməkçi göstəricilər — heç bir avtomatik cəza qərarı vermir */
export function riskFlags(i: { missed: number; attendanceRate: number | null }): {
  attention: boolean;
  attendanceWarning: boolean;
} {
  return {
    attention: i.missed >= 2,
    attendanceWarning: i.attendanceRate !== null && i.attendanceRate < 60,
  };
}
