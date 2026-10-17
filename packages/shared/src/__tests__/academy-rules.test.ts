import { describe, expect, it } from 'vitest';
import {
  academyAssignmentCreateSchema,
  academyCan,
  academyGroupCreateSchema,
  academySessionCreateSchema,
  assertRubricTotal,
  attendanceRate,
  computeFinalScore,
  deriveStudentStatus,
  effectiveDueAt,
  evaluateSubmissionWindow,
  expandWeeklySchedule,
  fromCenti,
  percent,
  riskFlags,
  safeUrlSchema,
  selectAttempt,
  toCenti,
  zonedDayInfo,
  zonedLocalToUtc,
  type AcademyActorContext,
} from '../index';

const d = (s: string) => new Date(s);

describe('toCenti / fromCenti — yuvarlaqlaşdırma', () => {
  it('2 onluğa qədər yarım yuxarı, float qalıqları olmadan', () => {
    expect(toCenti(1.005)).toBe(101);
    expect(toCenti(12.5)).toBe(1250);
    expect(toCenti(0.1 + 0.2)).toBe(30);
    expect(toCenti(99.994)).toBe(9999);
    expect(toCenti(99.995)).toBe(10000);
    expect(fromCenti(2550)).toBe(25.5);
  });
  it('sonsuz ədəd qəbul olunmur', () => {
    expect(() => toCenti(Number.NaN)).toThrow();
  });
});

describe('computeFinalScore — bal yoxlaması və gecikmə cəriməsi', () => {
  const base = {
    maxCenti: 10000,
    latePolicy: 'ACCEPT_WITH_PENALTY' as const,
    latePenaltyPercent: 10,
  };
  it('vaxtında — cərimə yoxdur', () => {
    expect(computeFinalScore({ ...base, rawCenti: 8550, isLate: false })).toEqual({
      rawCenti: 8550,
      penaltyCenti: 0,
      finalCenti: 8550,
    });
  });
  it('gecikmiş — xam balın faizi, yarım yuxarı', () => {
    expect(computeFinalScore({ ...base, rawCenti: 8555, isLate: true })).toEqual({
      rawCenti: 8555,
      penaltyCenti: 856,
      finalCenti: 7699,
    });
  });
  it('ACCEPT siyasətində gecikmə cərimə vermir', () => {
    expect(
      computeFinalScore({ ...base, latePolicy: 'ACCEPT', rawCenti: 5000, isLate: true }).finalCenti,
    ).toBe(5000);
  });
  it('0 ≤ bal ≤ maksimum', () => {
    expect(() => computeFinalScore({ ...base, rawCenti: 10001, isLate: false })).toThrow(
      'SCORE_OUT_OF_RANGE',
    );
    expect(() => computeFinalScore({ ...base, rawCenti: -1, isLate: false })).toThrow();
    expect(
      computeFinalScore({ ...base, latePenaltyPercent: 100, rawCenti: 7000, isLate: true })
        .finalCenti,
    ).toBe(0);
  });
});

describe('rubrika cəmi', () => {
  it('meyarların cəmi maksimuma bərabər olmalıdır', () => {
    const c = [20, 20, 25, 20, 15].map((p) => ({ maxScoreCenti: p * 100 }));
    expect(() => assertRubricTotal(c, 10000)).not.toThrow();
    expect(() => assertRubricTotal(c, 9000)).toThrow('RUBRIC_TOTAL_MISMATCH');
    expect(() => assertRubricTotal([{ maxScoreCenti: 0 }], 0)).toThrow('SCORE_OUT_OF_RANGE');
  });
});

describe('son tarix mühərriki', () => {
  const w = {
    availableAt: d('2026-10-20T08:00:00Z'),
    dueAt: d('2026-10-25T19:59:00Z'),
    latePolicy: 'REJECT' as const,
  };
  it('açılışdan əvvəl göndəriş yoxdur', () => {
    expect(evaluateSubmissionWindow({ ...w, now: d('2026-10-20T07:59:59.999Z') })).toMatchObject({
      allowed: false,
      reason: 'NOT_OPEN',
    });
    expect(evaluateSubmissionWindow({ ...w, now: d('2026-10-20T08:00:00Z') })).toMatchObject({
      allowed: true,
      late: false,
    });
  });
  it('son tarixin özü — vaxtında (sərhəd daxil), 1 ms sonra — gecikmiş', () => {
    expect(evaluateSubmissionWindow({ ...w, now: d('2026-10-25T19:59:00Z') })).toMatchObject({
      allowed: true,
      late: false,
    });
    expect(evaluateSubmissionWindow({ ...w, now: d('2026-10-25T19:59:00.001Z') })).toMatchObject({
      allowed: false,
      reason: 'DEADLINE_PASSED',
    });
  });
  it('gecikmə qəbul olunursa — gecikmiş işarəsi və son hədd', () => {
    const late = { ...w, latePolicy: 'ACCEPT' as const, lateCutoffAt: d('2026-10-26T19:59:00Z') };
    expect(evaluateSubmissionWindow({ ...late, now: d('2026-10-26T10:00:00Z') })).toMatchObject({
      allowed: true,
      late: true,
    });
    expect(evaluateSubmissionWindow({ ...late, now: d('2026-10-26T20:00:00Z') })).toMatchObject({
      allowed: false,
      reason: 'CUTOFF_PASSED',
    });
  });
  it('fərdi uzadılma yalnız həmin tələbənin son tarixini dəyişir', () => {
    const ext = d('2026-10-27T19:59:00Z');
    const now = d('2026-10-26T12:00:00Z');
    expect(evaluateSubmissionWindow({ ...w, now })).toMatchObject({ allowed: false });
    expect(evaluateSubmissionWindow({ ...w, now, extendedDueAt: ext })).toMatchObject({
      allowed: true,
      late: false,
    });
    expect(effectiveDueAt(w.dueAt, ext)).toEqual(ext);
    // ümumi son tarix sonradan uzadılmadan da sonraya keçsə — tələbə vaxt itirmir
    expect(effectiveDueAt(d('2026-10-30T00:00:00Z'), ext)).toEqual(d('2026-10-30T00:00:00Z'));
  });
  it('uzadılma gecikmə həddini də keçirsə, hədd uzadılmaya qədər çəkilir', () => {
    const r = evaluateSubmissionWindow({
      ...w,
      latePolicy: 'ACCEPT',
      lateCutoffAt: d('2026-10-26T00:00:00Z'),
      extendedDueAt: d('2026-10-28T00:00:00Z'),
      now: d('2026-10-27T00:00:00Z'),
    });
    expect(r).toMatchObject({ allowed: true, late: false });
  });
});

describe('cəhd seçimi', () => {
  const at = [
    { id: 'a1', attemptNumber: 1, autoScoreCenti: 9000 },
    { id: 'a2', attemptNumber: 2, autoScoreCenti: 6000 },
    { id: 'a3', attemptNumber: 3, autoScoreCenti: 9000 },
  ];
  it('defolt — son cəhd (ən yüksək bal avtomatik götürülmür)', () => {
    expect(selectAttempt(at, 'LATEST_ATTEMPT')?.id).toBe('a3');
    expect(selectAttempt([at[1]!, at[0]!], 'LATEST_ATTEMPT')?.id).toBe('a2');
  });
  it('HIGHEST_SCORE — bərabərlikdə sonuncu', () => {
    expect(selectAttempt(at, 'HIGHEST_SCORE')?.id).toBe('a3');
  });
  it('müəllimin seçdiyi cəhd bu göndərişə aid olmalıdır', () => {
    expect(selectAttempt(at, 'INSTRUCTOR_SELECTED', 'a2')?.id).toBe('a2');
    expect(() => selectAttempt(at, 'INSTRUCTOR_SELECTED', 'başqasının')).toThrow(
      'ATTEMPT_NOT_FOUND',
    );
    expect(selectAttempt([], 'LATEST_ATTEMPT')).toBeNull();
  });
});

describe('tələbə vaxtiyyəti', () => {
  const base = {
    availableAt: d('2026-10-20T00:00:00Z'),
    dueAt: d('2026-10-25T00:00:00Z'),
    latePolicy: 'REJECT' as const,
    attemptCount: 0,
    latestAttemptLate: false,
    latestAttemptAt: null,
    hasDraft: false,
    grade: null,
  };
  it('açılmamış tapşırıq MISSED deyil', () => {
    expect(deriveStudentStatus({ ...base, now: d('2026-10-19T00:00:00Z') }).status).toBe(
      'NOT_OPEN',
    );
  });
  it('başlanmayıb / davam edir / buraxılıb', () => {
    expect(deriveStudentStatus({ ...base, now: d('2026-10-21T00:00:00Z') }).status).toBe(
      'NOT_STARTED',
    );
    expect(
      deriveStudentStatus({ ...base, hasDraft: true, now: d('2026-10-21T00:00:00Z') }).status,
    ).toBe('IN_PROGRESS');
    expect(deriveStudentStatus({ ...base, now: d('2026-10-26T00:00:00Z') })).toMatchObject({
      status: 'MISSED',
      canSubmit: false,
    });
  });
  it('gecikmə qəbul olunursa son tarixdən sonra — hələ göndərilə bilər (overdue)', () => {
    expect(
      deriveStudentStatus({ ...base, latePolicy: 'ACCEPT', now: d('2026-10-26T00:00:00Z') }),
    ).toMatchObject({ status: 'NOT_STARTED', overdue: true, canSubmit: true });
  });
  it('göndərilib → yoxlanılır → qiymətlənib; qaytarılıb → yeni cəhd', () => {
    const sent = {
      ...base,
      attemptCount: 1,
      latestAttemptAt: d('2026-10-22T00:00:00Z'),
      now: d('2026-10-23T00:00:00Z'),
    };
    expect(deriveStudentStatus(sent).status).toBe('SUBMITTED');
    expect(deriveStudentStatus({ ...sent, latestAttemptLate: true }).status).toBe('SUBMITTED_LATE');
    expect(
      deriveStudentStatus({
        ...sent,
        grade: { status: 'DRAFT', updatedAt: d('2026-10-22T12:00:00Z') },
      }).status,
    ).toBe('UNDER_REVIEW');
    expect(
      deriveStudentStatus({
        ...sent,
        grade: { status: 'RELEASED', updatedAt: d('2026-10-22T12:00:00Z') },
      }),
    ).toMatchObject({ status: 'GRADED', canSubmit: false });
    const returned = { status: 'RETURNED' as const, updatedAt: d('2026-10-22T12:00:00Z') };
    expect(deriveStudentStatus({ ...sent, grade: returned }).status).toBe('RETURNED');
    expect(
      deriveStudentStatus({
        ...sent,
        attemptCount: 2,
        latestAttemptAt: d('2026-10-22T13:00:00Z'),
        grade: returned,
      }).status,
    ).toBe('SUBMITTED');
  });
});

describe('icazə cədvəli', () => {
  const ctx = (c: Partial<AcademyActorContext>): AcademyActorContext => ({
    isAdmin: false,
    instructorRole: null,
    enrollmentStatus: null,
    ...c,
  });
  it('admin hər şeyi idarə edir, amma tələbə kimi göndəriş etmir', () => {
    expect(academyCan(ctx({ isAdmin: true }), 'group.manageEnrollments')).toBe(true);
    expect(academyCan(ctx({ isAdmin: true }), 'grade.release')).toBe(true);
    expect(academyCan(ctx({ isAdmin: true }), 'student.submit')).toBe(false);
  });
  it('aparıcı müəllim öz qrupunda dərc edir və qiyməti açır, təşkilatı idarə etmir', () => {
    const lead = ctx({ instructorRole: 'LEAD' });
    expect(academyCan(lead, 'assignment.publish')).toBe(true);
    expect(academyCan(lead, 'grade.release')).toBe(true);
    expect(academyCan(lead, 'group.manageEnrollments')).toBe(false);
    expect(academyCan(lead, 'group.manageStaff')).toBe(false);
  });
  it('köməkçi müəllim: yoxlayır və qaralama qiymət yazır, dərc etmir və qiymət açmır', () => {
    const a = ctx({ instructorRole: 'ASSISTANT' });
    expect(academyCan(a, 'grade.write')).toBe(true);
    expect(academyCan(a, 'attendance.manage')).toBe(true);
    expect(academyCan(a, 'assignment.publish')).toBe(false);
    expect(academyCan(a, 'grade.release')).toBe(false);
    expect(academyCan(a, 'assignment.extend')).toBe(false);
  });
  it('tələbə: məzmun və göndəriş yalnız ACTIVE; dayandırılanda öz qeydləri qalır', () => {
    expect(academyCan(ctx({ enrollmentStatus: 'ACTIVE' }), 'student.submit')).toBe(true);
    expect(academyCan(ctx({ enrollmentStatus: 'PAUSED' }), 'student.viewContent')).toBe(false);
    expect(academyCan(ctx({ enrollmentStatus: 'PAUSED' }), 'student.viewOwnRecords')).toBe(true);
    expect(academyCan(ctx({ enrollmentStatus: 'WITHDRAWN' }), 'group.view')).toBe(false);
    expect(academyCan(ctx({ enrollmentStatus: 'PENDING' }), 'student.viewOwnRecords')).toBe(false);
    expect(academyCan(ctx({ enrollmentStatus: 'ACTIVE' }), 'grade.write')).toBe(false);
  });
  it('heç bir əlaqəsi olmayan istifadəçi heç nə edə bilmir', () => {
    expect(academyCan(ctx({}), 'group.view')).toBe(false);
  });
});

describe('vaxt zonası və təkrarlanan cədvəl', () => {
  it('Asia/Baku (UTC+4): 19:00 yerli = 15:00 UTC', () => {
    expect(zonedLocalToUtc('2026-10-19', '19:00', 'Asia/Baku').toISOString()).toBe(
      '2026-10-19T15:00:00.000Z',
    );
    expect(zonedDayInfo(d('2026-10-19T21:00:00Z'), 'Asia/Baku')).toEqual({
      date: '2026-10-20',
      weekday: 2,
    });
  });
  it('yay vaxtı olan zonada keçid günü düzgün çevrilir (Europe/Berlin)', () => {
    expect(zonedLocalToUtc('2026-03-30', '10:00', 'Europe/Berlin').toISOString()).toBe(
      '2026-03-30T08:00:00.000Z',
    );
    expect(zonedLocalToUtc('2026-03-27', '10:00', 'Europe/Berlin').toISOString()).toBe(
      '2026-03-27T09:00:00.000Z',
    );
  });
  it('həftədə iki dərs (B.e və Ç.a) — hər biri ayrıca sətir', () => {
    const s = expandWeeklySchedule({
      startDate: '2026-10-19',
      endDate: '2026-11-01',
      weekdays: [1, 3],
      startTime: '19:00',
      durationMinutes: 120,
      timezone: 'Asia/Baku',
    });
    expect(s.map((x) => x.startsAt.toISOString())).toEqual([
      '2026-10-19T15:00:00.000Z',
      '2026-10-21T15:00:00.000Z',
      '2026-10-26T15:00:00.000Z',
      '2026-10-28T15:00:00.000Z',
    ]);
    expect(s[0]!.endsAt.toISOString()).toBe('2026-10-19T17:00:00.000Z');
  });
});

describe('analitika düsturları', () => {
  it('faiz: məxrəc 0 → null (0 % deyil)', () => {
    expect(percent(7, 9)).toBe(77.8);
    expect(percent(0, 0)).toBeNull();
  });
  it('davamiyyət: üzrlü qeydlər məxrəcə daxil deyil', () => {
    expect(attendanceRate({ present: 8, late: 1, absent: 1, excused: 2 })).toBe(90);
  });
  it('risk göstəriciləri yalnız məlumatdır', () => {
    expect(riskFlags({ missed: 2, attendanceRate: 59 })).toEqual({
      attention: true,
      attendanceWarning: true,
    });
    expect(riskFlags({ missed: 1, attendanceRate: null })).toEqual({
      attention: false,
      attendanceWarning: false,
    });
  });
});

describe('giriş şəmaları', () => {
  it('qrup: kod formatı və tarix sırası', () => {
    const ok = academyGroupCreateSchema.safeParse({
      programId: 'p1',
      code: 'de-001',
      name: 'DE-001',
    });
    expect(ok.success && ok.data.code).toBe('DE-001');
    expect(ok.success && ok.data.timezone).toBe('Asia/Baku');
    expect(
      academyGroupCreateSchema.safeParse({
        programId: 'p1',
        code: 'DE-001',
        name: 'x',
        startAt: '2026-11-01T00:00:00Z',
        endAt: '2026-10-01T00:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      academyGroupCreateSchema.safeParse({ programId: 'p1', code: 'DE 001', name: 'x' }).success,
    ).toBe(false);
    expect(
      academyGroupCreateSchema.safeParse({
        programId: 'p1',
        code: 'DE-1',
        name: 'x',
        timezone: 'Mars/Base',
      }).success,
    ).toBe(false);
  });
  it('tapşırıq: son tarix açılışdan sonra, defolt siyasətlər', () => {
    const r = academyAssignmentCreateSchema.safeParse({
      title: 'SQL ev tapşırığı #1',
      type: 'EXISTING_CHALLENGE',
      availableAt: '2026-10-20T00:00:00Z',
      dueAt: '2026-10-25T19:59:00Z',
      items: [{ kind: 'LEARNING_STEP', stepId: 's1', maxScore: 20 }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.maxAttempts).toBe(3);
      expect(r.data.latePolicy).toBe('REJECT');
      expect(r.data.attemptSelection).toBe('LATEST_ATTEMPT');
    }
    expect(
      academyAssignmentCreateSchema.safeParse({
        title: 'x',
        type: 'CUSTOM_TASK',
        availableAt: '2026-10-25T00:00:00Z',
        dueAt: '2026-10-20T00:00:00Z',
        items: [{ kind: 'TEXT', title: 'Cavab', maxScore: 10 }],
      }).success,
    ).toBe(false);
  });
  it('linklər: yalnız https (javascript: qəbul olunmur)', () => {
    expect(safeUrlSchema.safeParse('https://meet.example.com/abc').success).toBe(true);
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeUrlSchema.safeParse('http://evil.example.com').success).toBe(false);
    expect(
      academySessionCreateSchema.safeParse({
        title: 'Dərs',
        startsAt: '2026-10-20T15:00:00Z',
        endsAt: '2026-10-20T15:00:00Z',
      }).success,
    ).toBe(false);
  });
});

describe('yeniləmə şəmaları defolt yazmır (zod 4 partial)', () => {
  it('qismən yeniləmədə ötürülməyən sahə yoxdur', async () => {
    const { academyGroupUpdateSchema, academyProgramUpdateSchema, academyAssignmentUpdateSchema } =
      await import('../index');
    expect(academyGroupUpdateSchema.parse({ capacity: 5 })).toEqual({ capacity: 5 });
    expect(academyProgramUpdateSchema.parse({ title: 'Yeni' })).toEqual({ title: 'Yeni' });
    expect(academyAssignmentUpdateSchema.parse({ title: 'Yeni' })).toEqual({ title: 'Yeni' });
  });
});

describe('cəhd limiti və avtomatik bal', () => {
  it('limit dolubsa yeni cəhd yoxdur; qaytarılmış göndərişə bir düzəliş cəhdi', async () => {
    const { attemptLimitReached } = await import('../index');
    expect(
      attemptLimitReached({ attemptsUsed: 2, maxAttempts: 3, returnedAwaitingResubmission: false }),
    ).toBe(false);
    expect(
      attemptLimitReached({ attemptsUsed: 3, maxAttempts: 3, returnedAwaitingResubmission: false }),
    ).toBe(true);
    expect(
      attemptLimitReached({ attemptsUsed: 3, maxAttempts: 3, returnedAwaitingResubmission: true }),
    ).toBe(false);
  });

  it('maksimum × nisbət, sərhədlər daxilində', async () => {
    const { scaleScore } = await import('../index');
    expect(scaleScore(2550, 1)).toBe(2550);
    expect(scaleScore(2550, 0.5)).toBe(1275);
    expect(scaleScore(1000, 2 / 3)).toBe(667);
    expect(scaleScore(1000, 1.4)).toBe(1000);
    expect(scaleScore(1000, -1)).toBe(0);
    expect(scaleScore(1000, Number.NaN)).toBe(0);
  });

  it('qaralama fayl bölgüsünü saxlayır; uzantı siyahısında SVG / HTML yoxdur', async () => {
    const { academyDraftSchema, ACADEMY_FILE_EXTENSIONS } = await import('../index');
    const id = 'ckxxxxxxxxxxxxxxxxxxxxxxx';
    const r = academyDraftSchema.safeParse({ answers: [{ itemId: id, fileIds: [id] }] });
    expect(r.success).toBe(true);
    expect(ACADEMY_FILE_EXTENSIONS).toContain('ipynb');
    expect(ACADEMY_FILE_EXTENSIONS).not.toContain('svg');
    expect(ACADEMY_FILE_EXTENSIONS).not.toContain('html');
  });
});
