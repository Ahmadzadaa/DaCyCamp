import type { ProgressStatus, StepState, StepType } from '../enums';

export interface MapStepInput {
  id: string;
  key: string;
  type: StepType;
  title: string;
  xp: number;
  order: number;
  isPublished?: boolean;
  estimatedMinutes?: number | null;
}
export interface MapModuleInput {
  id: string;
  key: string;
  title: string;
  order: number;
  isPublished?: boolean;
  steps: MapStepInput[];
}
export interface ProgressRow {
  stepId: string;
  status: ProgressStatus;
  score?: number | null;
  attempts?: number;
}

export type ModuleState = 'done' | 'active' | 'locked' | 'empty';

export interface MapStep extends MapStepInput {
  state: StepState;
  index: number; // kurs daxilində 0-dan
  moduleKey: string;
  score: number | null;
  attempts: number;
}
export interface MapModule extends Omit<MapModuleInput, 'steps'> {
  steps: MapStep[];
  state: ModuleState;
  done: number;
  total: number;
}
export interface CourseMap {
  modules: MapModule[];
  done: number;
  total: number;
  percent: number;
  isComplete: boolean;
  continueStep: { stepId: string; moduleKey: string; stepKey: string; index: number } | null;
  flat: MapStep[];
}

export const percentOf = (done: number, total: number) =>
  total === 0 ? 0 : Math.floor((100 * done) / total);

/**
 * Kursun bütün dərc olunmuş addımlarını (fəsil.order, addım.order) üzrə bir xəttə düzüb hər birinin
 * vəziyyətini hesablayır. API bu funksiyanı oxuyanda da, yazanda da işlədir; UI yalnız göstərir.
 */
export function computeCourseMap(opts: {
  sequential: boolean;
  modules: MapModuleInput[];
  progress: ProgressRow[];
  includeUnpublished?: boolean;
  /** admin tərəfindən əl ilə açılmış addımlar (ardıcıl kilidi keçir) */
  unlocked?: string[];
}): CourseMap {
  const inc = opts.includeUnpublished === true;
  const prog = new Map(opts.progress.map((p) => [p.stepId, p]));
  const manual = new Set(opts.unlocked ?? []);
  const modules = [...opts.modules]
    .filter((m) => inc || m.isPublished !== false)
    .sort((a, b) => a.order - b.order);

  const flat: MapStep[] = [];
  const out: MapModule[] = [];
  let prevCompleted = true;
  let index = 0;
  for (const m of modules) {
    const steps = [...m.steps]
      .filter((s) => inc || s.isPublished !== false)
      .sort((a, b) => a.order - b.order);
    const mapped: MapStep[] = [];
    for (const s of steps) {
      const p = prog.get(s.id);
      let state: StepState;
      if (p?.status === 'COMPLETED') state = 'completed';
      else if (p) state = 'in_progress';
      else if (!opts.sequential || index === 0 || prevCompleted || manual.has(s.id))
        state = 'available';
      else state = 'locked';
      // ardıcıl rejimdə: in_progress olan addım tamamlanmayıbsa, sonrakılar kilidlənir
      if (
        opts.sequential &&
        p &&
        p.status !== 'COMPLETED' &&
        !(index === 0 || prevCompleted || manual.has(s.id))
      )
        state = 'locked';
      const ms: MapStep = {
        ...s,
        state,
        index,
        moduleKey: m.key,
        score: p?.score ?? null,
        attempts: p?.attempts ?? 0,
      };
      mapped.push(ms);
      flat.push(ms);
      prevCompleted = state === 'completed';
      index++;
    }
    const done = mapped.filter((s) => s.state === 'completed').length;
    const total = mapped.length;
    let mstate: ModuleState = 'locked';
    if (total === 0) mstate = 'empty';
    else if (done === total) mstate = 'done';
    else if (mapped.some((s) => s.state === 'available' || s.state === 'in_progress'))
      mstate = 'active';
    out.push({
      id: m.id,
      key: m.key,
      title: m.title,
      order: m.order,
      isPublished: m.isPublished,
      steps: mapped,
      state: mstate,
      done,
      total,
    });
  }
  const done = flat.filter((s) => s.state === 'completed').length;
  const total = flat.length;
  const next = flat.find((s) => s.state === 'in_progress' || s.state === 'available') ?? null;
  return {
    modules: out,
    done,
    total,
    percent: percentOf(done, total),
    isComplete: total > 0 && done === total,
    continueStep: next
      ? { stepId: next.id, moduleKey: next.moduleKey, stepKey: next.key, index: next.index }
      : null,
    flat,
  };
}
