import {
  DEFAULT_HINT_PENALTY_XP,
  DEFAULT_LAB_MINUTES,
  DEFAULT_PASS_SCORE,
  DEFAULT_XP,
} from '../constants';
import type { StepType } from '../enums';
import { stepTypeFromSlug, stepTypeToSlug } from '../enums';
import {
  stepDefinitionDraft,
  stepDefinitionStrict,
  zodIssues,
  type Issue,
  type StepDefinition,
  type QuizQuestionType,
  type StepDefinitionDraft,
} from './step-definition';

/* ───────────── saxlanılan formalar ───────────── */

export interface TheoryConfig {
  content: string;
  video_url?: string;
}
export interface QuizConfig {
  pass_score: number;
  shuffle_questions: boolean;
  questions: Array<{
    text: string;
    type: QuizQuestionType;
    options: string[];
    /** yalnız classify */
    buckets?: string[];
  }>;
}
export interface QuizSecret {
  questions: Array<{ correct: number[]; explanation?: string }>;
}
export interface SqlConfig {
  instructions: string;
  dataset: string[];
  starter_code: string;
  check: string;
  tasks: string[];
  hint_count: number;
}
export interface SqlSecret {
  solution: string;
  hints: string[];
  expected?: { columns: string[]; row_count: number; row_hash: string };
}
export interface PythonConfig {
  instructions: string;
  dataset: string[];
  starter_code: string;
  tests: string;
  tasks: string[];
  hint_count: number;
}
export interface PythonSecret {
  solution?: string;
  hints: string[];
}
export interface TerminalConfig {
  instructions: string;
  docker_image: string;
  time_limit_minutes: number;
  tasks: string[];
  hint_count: number;
  /** konteynerdə internet */
  network: boolean;
}
export interface TerminalSecret {
  check_script: string;
  hints: string[];
}
export interface CtfConfig {
  instructions: string;
  attachments: string[];
  docker_image?: string;
  hint_penalty_xp: number;
}

export type StepConfig =
  TheoryConfig | QuizConfig | SqlConfig | PythonConfig | TerminalConfig | CtfConfig;
export type StepSecret = QuizSecret | SqlSecret | PythonSecret | TerminalSecret | null;

export interface CtfTaskInput {
  key: string;
  order: number;
  question: string;
  hint?: string;
  points: number;
  caseSensitive: boolean;
  /** yalnız biri: açıq cavab (API hash-ləyəcək) və ya mövcud hash */
  answer?: string;
  answerHash?: string;
}

export interface SplitResult {
  type: StepType;
  title: string;
  xp: number;
  estimatedMinutes: number | null;
  config: StepConfig;
  secret: StepSecret;
  ctfTasks: CtfTaskInput[];
}

const arr = (d: string | string[] | undefined): string[] =>
  d === undefined ? [] : Array.isArray(d) ? d : [d];
/** ixracda: boşdursa yazma, bir dənədirsə sətir, çoxdursa siyahı */
const datasetOut = (d: unknown): { dataset?: string | string[] } => {
  const list = Array.isArray(d) ? (d as string[]) : d ? [d as string] : [];
  if (list.length === 0) return {};
  return { dataset: list.length === 1 ? list[0] : list };
};

/** Müəllim formasını / YAML-ı baza sütunlarına bölür. Heç bir gizli sahə config-ə düşmür. */
export function splitStep(def: StepDefinitionDraft | StepDefinition): SplitResult {
  const type = stepTypeFromSlug(def.type);
  const xp = def.xp ?? DEFAULT_XP[type];
  const estimatedMinutes = def.estimated_minutes ?? null;
  const common = { type, title: def.title, xp, estimatedMinutes };
  switch (def.type) {
    case 'theory':
      return {
        ...common,
        config: {
          content: def.content ?? '',
          ...(def.video_url ? { video_url: def.video_url } : {}),
        },
        secret: null,
        ctfTasks: [],
      };
    case 'quiz': {
      const questions = def.questions ?? [];
      return {
        ...common,
        config: {
          pass_score: def.pass_score ?? DEFAULT_PASS_SCORE,
          shuffle_questions: def.shuffle_questions ?? false,
          questions: questions.map((q) => ({
            text: q.text ?? '',
            type: q.type ?? 'single',
            options: q.options ?? [],
            ...(q.type === 'classify' ? { buckets: q.buckets ?? [] } : {}),
          })),
        },
        secret: {
          questions: questions.map((q) => ({
            correct: q.correct ?? [],
            ...(q.explanation ? { explanation: q.explanation } : {}),
          })),
        },
        ctfTasks: [],
      };
    }
    case 'sql': {
      const hints = def.hints ?? [];
      return {
        ...common,
        config: {
          instructions: def.instructions ?? '',
          dataset: arr(def.dataset),
          starter_code: def.starter_code ?? '',
          check: def.check ?? 'result_match',
          tasks: def.tasks ?? [],
          hint_count: hints.length,
          hint_penalty_xp: def.hint_penalty_xp ?? DEFAULT_HINT_PENALTY_XP,
        },
        secret: { solution: def.solution ?? '', hints },
        ctfTasks: [],
      };
    }
    case 'python': {
      const hints = def.hints ?? [];
      return {
        ...common,
        config: {
          instructions: def.instructions ?? '',
          dataset: arr(def.dataset),
          starter_code: def.starter_code ?? '',
          tests: def.tests ?? '',
          tasks: def.tasks ?? [],
          hint_count: hints.length,
          hint_penalty_xp: def.hint_penalty_xp ?? DEFAULT_HINT_PENALTY_XP,
        },
        secret: { ...(def.solution ? { solution: def.solution } : {}), hints },
        ctfTasks: [],
      };
    }
    case 'terminal': {
      const hints = def.hints ?? [];
      return {
        ...common,
        config: {
          instructions: def.instructions ?? '',
          docker_image: def.docker_image ?? '',
          time_limit_minutes: def.time_limit_minutes ?? DEFAULT_LAB_MINUTES,
          tasks: def.tasks ?? [],
          hint_count: hints.length,
          hint_penalty_xp: def.hint_penalty_xp ?? 0,
          network: def.network ?? false,
        },
        secret: { check_script: def.check_script ?? '', hints },
        ctfTasks: [],
      };
    }
    case 'ctf': {
      const tasks = def.tasks ?? [];
      const defaultPoints = tasks.length ? Math.floor(xp / tasks.length) : 0;
      return {
        ...common,
        config: {
          instructions: def.instructions ?? '',
          attachments: def.attachments ?? [],
          ...(def.docker_image ? { docker_image: def.docker_image } : {}),
          hint_penalty_xp: def.hint_penalty_xp ?? DEFAULT_HINT_PENALTY_XP,
        },
        secret: null,
        ctfTasks: tasks.map((t, i) => ({
          key: t.key ?? `t${i + 1}`,
          order: i + 1,
          question: t.question ?? '',
          ...(t.hint ? { hint: t.hint } : {}),
          points: t.points ?? defaultPoints,
          caseSensitive: t.case_sensitive ?? false,
          ...(t.answer && t.answer.trim() ? { answer: t.answer } : {}),
          ...(t.answer_hash ? { answerHash: t.answer_hash } : {}),
        })),
      };
    }
  }
}

export interface CtfTaskRow {
  id?: string;
  key: string;
  order: number;
  question: string;
  hint?: string | null;
  points: number;
  caseSensitive: boolean;
  answerHash: string;
}

/** Baza sütunlarını müəllim formasına qaytarır (admin GET + ixrac). CTF cavabları yalnız answer_hash kimi. */
export function mergeStep(
  type: StepType,
  title: string,
  xp: number,
  estimatedMinutes: number | null,
  config: unknown,
  secret: unknown,
  ctfTasks: CtfTaskRow[] = [],
): StepDefinitionDraft {
  const c = (config ?? {}) as Record<string, unknown>;
  const s = (secret ?? {}) as Record<string, unknown>;
  const base = {
    title,
    xp,
    ...(estimatedMinutes != null ? { estimated_minutes: estimatedMinutes } : {}),
  };
  switch (type) {
    case 'THEORY':
      return {
        type: 'theory',
        ...base,
        content: (c.content as string) ?? '',
        ...(c.video_url ? { video_url: c.video_url as string } : {}),
      };
    case 'QUIZ': {
      const qs = (c.questions as QuizConfig['questions']) ?? [];
      const ss = (s.questions as QuizSecret['questions']) ?? [];
      return {
        type: 'quiz',
        ...base,
        pass_score: (c.pass_score as number) ?? DEFAULT_PASS_SCORE,
        shuffle_questions: (c.shuffle_questions as boolean) ?? false,
        questions: qs.map((q, i) => ({
          text: q.text,
          type: q.type,
          options: q.options,
          ...(q.type === 'classify' ? { buckets: q.buckets ?? [] } : {}),
          correct: ss[i]?.correct ?? [],
          ...(ss[i]?.explanation ? { explanation: ss[i]!.explanation } : {}),
        })),
      };
    }
    case 'SQL':
      return {
        type: 'sql',
        ...base,
        instructions: (c.instructions as string) ?? '',
        ...datasetOut(c.dataset),
        starter_code: (c.starter_code as string) ?? '',
        solution: (s.solution as string) ?? '',
        check: ((c.check as string) ?? 'result_match') as 'result_match' | 'result_match_unordered',
        hints: (s.hints as string[]) ?? [],
        tasks: (c.tasks as string[]) ?? [],
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
      };
    case 'PYTHON':
      return {
        type: 'python',
        ...base,
        instructions: (c.instructions as string) ?? '',
        starter_code: (c.starter_code as string) ?? '',
        ...datasetOut(c.dataset),
        ...(s.solution ? { solution: s.solution as string } : {}),
        tests: (c.tests as string) ?? '',
        hints: (s.hints as string[]) ?? [],
        tasks: (c.tasks as string[]) ?? [],
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
      };
    case 'TERMINAL':
      return {
        type: 'terminal',
        ...base,
        instructions: (c.instructions as string) ?? '',
        docker_image: (c.docker_image as string) ?? '',
        time_limit_minutes: (c.time_limit_minutes as number) ?? DEFAULT_LAB_MINUTES,
        check_script: (s.check_script as string) ?? '',
        hints: (s.hints as string[]) ?? [],
        tasks: (c.tasks as string[]) ?? [],
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? 0,
        network: (c.network as boolean) ?? false,
      };
    case 'CTF':
      return {
        type: 'ctf',
        ...base,
        instructions: (c.instructions as string) ?? '',
        attachments: (c.attachments as string[]) ?? [],
        ...(c.docker_image ? { docker_image: c.docker_image as string } : {}),
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
        tasks: [...ctfTasks]
          .sort((a, b) => a.order - b.order)
          .map((t) => ({
            key: t.key,
            question: t.question,
            answer_hash: t.answerHash,
            ...(t.hint ? { hint: t.hint } : {}),
            points: t.points,
            case_sensitive: t.caseSensitive,
          })),
      };
  }
}

/* ───────────── tələbə görünüşü ───────────── */

export interface AttachmentView {
  path: string;
  url: string;
  filename: string;
  size_bytes: number;
}
export interface CtfTaskView {
  id: string;
  key: string;
  question: string;
  points: number;
  solved: boolean;
  hint_available: boolean;
  hint?: string;
}

export type TheoryStudentView = { kind: 'theory'; content: string; video_url?: string };
export type QuizStudentView = {
  kind: 'quiz';
  pass_score: number;
  questions: QuizConfig['questions'];
};
export type SqlStudentView = {
  kind: 'sql';
  instructions: string;
  dataset: AttachmentView[];
  starter_code: string;
  check: string;
  tasks: string[];
  hint_count: number;
  hints_unlocked: string[];
  hint_penalty_xp: number;
};
export type PythonStudentView = {
  kind: 'python';
  instructions: string;
  dataset: AttachmentView[];
  starter_code: string;
  tests: string;
  tasks: string[];
  hint_count: number;
  hints_unlocked: string[];
  hint_penalty_xp: number;
};
export type TerminalStudentView = {
  kind: 'terminal';
  instructions: string;
  docker_image: string;
  time_limit_minutes: number;
  network: boolean;
  tasks: string[];
  hint_count: number;
  hints_unlocked: string[];
  hint_penalty_xp: number;
};
export type CtfStudentView = {
  kind: 'ctf';
  instructions: string;
  attachments: AttachmentView[];
  hint_penalty_xp: number;
  /** istəyə bağlı konteyner terminalı (docker_image verilibsə) */
  has_terminal: boolean;
  tasks: CtfTaskView[];
};
export type StepStudentView =
  | TheoryStudentView
  | QuizStudentView
  | SqlStudentView
  | PythonStudentView
  | TerminalStudentView
  | CtfStudentView;

export interface StudentViewMeta {
  /** açılmış ipucuların mətni (HintUsage-ə görə) */
  unlockedHints?: string[];
  ctfTasks?: Array<CtfTaskRow & { id: string; solved: boolean; hintUnlocked: boolean }>;
  resolveAsset?: (path: string) => AttachmentView | null;
}

/** Yalnız ictimai sahələrdən tələbə görünüşü qurur; secret bura heç vaxt verilmir. */
export function toStudentView(
  type: StepType,
  config: unknown,
  meta: StudentViewMeta = {},
): StepStudentView {
  const c = (config ?? {}) as Record<string, unknown>;
  const resolve = (paths: string[]): AttachmentView[] =>
    paths.map(
      (p) =>
        meta.resolveAsset?.(p) ?? {
          path: p,
          url: '',
          filename: p.split('/').pop() ?? p,
          size_bytes: 0,
        },
    );
  const hints = meta.unlockedHints ?? [];
  switch (type) {
    case 'THEORY':
      return {
        kind: 'theory',
        content: (c.content as string) ?? '',
        ...(c.video_url ? { video_url: c.video_url as string } : {}),
      };
    case 'QUIZ':
      return {
        kind: 'quiz',
        pass_score: (c.pass_score as number) ?? DEFAULT_PASS_SCORE,
        questions: ((c.questions as QuizConfig['questions']) ?? []).map((q) => ({
          text: q.text,
          type: q.type,
          options: q.options,
          ...(q.type === 'classify' ? { buckets: q.buckets ?? [] } : {}),
        })),
      };
    case 'SQL':
      return {
        kind: 'sql',
        instructions: (c.instructions as string) ?? '',
        dataset: resolve((c.dataset as string[]) ?? []),
        starter_code: (c.starter_code as string) ?? '',
        check: (c.check as string) ?? 'result_match',
        tasks: (c.tasks as string[]) ?? [],
        hint_count: (c.hint_count as number) ?? 0,
        hints_unlocked: hints,
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
      };
    case 'PYTHON':
      return {
        kind: 'python',
        instructions: (c.instructions as string) ?? '',
        dataset: resolve((c.dataset as string[]) ?? []),
        starter_code: (c.starter_code as string) ?? '',
        tests: (c.tests as string) ?? '',
        tasks: (c.tasks as string[]) ?? [],
        hint_count: (c.hint_count as number) ?? 0,
        hints_unlocked: hints,
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
      };
    case 'TERMINAL':
      return {
        kind: 'terminal',
        instructions: (c.instructions as string) ?? '',
        docker_image: (c.docker_image as string) ?? '',
        time_limit_minutes: (c.time_limit_minutes as number) ?? DEFAULT_LAB_MINUTES,
        tasks: (c.tasks as string[]) ?? [],
        hint_count: (c.hint_count as number) ?? 0,
        hints_unlocked: hints,
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? 0,
        network: (c.network as boolean) ?? false,
      };
    case 'CTF':
      return {
        kind: 'ctf',
        instructions: (c.instructions as string) ?? '',
        attachments: resolve((c.attachments as string[]) ?? []),
        hint_penalty_xp: (c.hint_penalty_xp as number) ?? DEFAULT_HINT_PENALTY_XP,
        has_terminal: !!(c.docker_image as string | undefined),
        tasks: (meta.ctfTasks ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((t) => ({
            id: t.id,
            key: t.key,
            question: t.question,
            points: t.points,
            solved: t.solved,
            hint_available: !!t.hint,
            ...(t.hintUnlocked && t.hint ? { hint: t.hint } : {}),
          })),
      };
  }
}

/* ───────────── validasiya ───────────── */

export function parseDraft(
  input: unknown,
): { ok: true; def: StepDefinitionDraft } | { ok: false; issues: Issue[] } {
  const r = stepDefinitionDraft.safeParse(input);
  return r.success ? { ok: true, def: r.data } : { ok: false, issues: zodIssues(r.error) };
}

function isUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

/** Dərc üçün sərt yoxlama + istinad edilən faylların mövcudluğu */
export function validateForPublish(
  input: unknown,
  assetPaths: ReadonlySet<string> = new Set(),
): Issue[] {
  const r = stepDefinitionStrict.safeParse(input);
  if (!r.success) return zodIssues(r.error);
  const def = r.data;
  const issues: Issue[] = [];
  const need = (p: string | undefined, path: string) => {
    if (p && !assetPaths.has(p)) issues.push({ path, message: `Fayl tapılmadı: ${p}` });
  };
  switch (def.type) {
    case 'theory':
      if (!def.content.trim() && !def.video_url)
        issues.push({ path: 'content', message: 'Məzmun boş ola bilməz (və ya video əlavə edin)' });
      if (def.video_url && !isUrl(def.video_url)) need(def.video_url, 'video_url');
      break;
    case 'sql':
    case 'python':
      arr(def.dataset).forEach((d, i) => need(d, `dataset.${i}`));
      break;
    case 'terminal':
      need(def.check_script, 'check_script');
      break;
    case 'ctf':
      def.attachments.forEach((a, i) => need(a, `attachments.${i}`));
      break;
  }
  return issues;
}

export function stepTypeSlug(type: StepType) {
  return stepTypeToSlug(type);
}

/** Yeni addım üçün boş skelet (nümunə məzmun yoxdur) */
export function emptyDefinition(type: StepType, title: string): StepDefinitionDraft {
  const base = { title, xp: DEFAULT_XP[type] };
  switch (type) {
    case 'THEORY':
      return { type: 'theory', ...base, content: '' };
    case 'QUIZ':
      return {
        type: 'quiz',
        ...base,
        pass_score: DEFAULT_PASS_SCORE,
        shuffle_questions: false,
        questions: [],
      };
    case 'SQL':
      return {
        type: 'sql',
        ...base,
        instructions: '',
        starter_code: '',
        solution: '',
        check: 'result_match',
        hints: [],
        tasks: [],
        hint_penalty_xp: DEFAULT_HINT_PENALTY_XP,
      };
    case 'PYTHON':
      return {
        type: 'python',
        ...base,
        instructions: '',
        starter_code: '',
        tests: '',
        hints: [],
        tasks: [],
        hint_penalty_xp: DEFAULT_HINT_PENALTY_XP,
      };
    case 'TERMINAL':
      return {
        type: 'terminal',
        ...base,
        instructions: '',
        docker_image: '',
        time_limit_minutes: DEFAULT_LAB_MINUTES,
        check_script: '',
        hints: [],
        tasks: [],
        hint_penalty_xp: 0,
        network: false,
      };
    case 'CTF':
      return {
        type: 'ctf',
        ...base,
        instructions: '',
        attachments: [],
        hint_penalty_xp: DEFAULT_HINT_PENALTY_XP,
        tasks: [],
      };
  }
}
