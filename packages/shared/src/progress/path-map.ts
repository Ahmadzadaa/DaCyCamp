/**
 * Yol xəritəsi: addımların vəziyyəti və yolun faizi.
 * Kurs addımı kursun irəliləyişindən (StepProgress), digərləri PathItemProgress-dən gəlir.
 * Faiz = tamamlanmış məcburi addım / məcburi addım sayı; seçmə addımlar məxrəcə girmir və kilidləmir.
 */
import type { PathItemType } from '../enums';

export type PathItemStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED';
export type PathItemState = 'completed' | 'current' | 'available' | 'locked' | 'submitted';

export interface PathMapItemInput {
  id: string;
  key: string;
  order: number;
  type: PathItemType;
  isOptional: boolean;
  /** kurs addımı: kurs bitibmi; digər: status PASSED */
  courseCompleted?: boolean;
  status?: PathItemStatus | null;
}

export interface PathMapItem<T extends PathMapItemInput = PathMapItemInput> {
  item: T;
  state: PathItemState;
  /** məcburi addımların sıra nömrəsi (seçmələr nömrələnmir) */
  number: number | null;
}

export interface PathMap<T extends PathMapItemInput = PathMapItemInput> {
  items: PathMapItem<T>[];
  done: number;
  total: number;
  percent: number;
  isComplete: boolean;
  /** «Davam et» üçün: ilk tamamlanmamış məcburi addım */
  continueItem: T | null;
}

export const isItemDone = (it: PathMapItemInput) =>
  it.type === 'COURSE' ? !!it.courseCompleted : it.status === 'PASSED';

export function computePathMap<T extends PathMapItemInput>(opts: {
  sequential: boolean;
  items: T[];
}): PathMap<T> {
  const sorted = [...opts.items].sort((a, b) => a.order - b.order);
  const required = sorted.filter((i) => !i.isOptional);
  const total = required.length;
  const done = required.filter(isItemDone).length;
  const percent = total === 0 ? 0 : Math.floor((100 * done) / total);
  const isComplete = total > 0 && done === total;
  let blocked = false; // ardıcıl rejimdə: tamamlanmamış məcburi addımdan sonra hər şey kilidli
  let currentSet = false;
  let number = 0;
  const items = sorted.map((it): PathMapItem<T> => {
    const finished = isItemDone(it);
    let state: PathItemState;
    if (finished) state = 'completed';
    else if (it.status === 'SUBMITTED') state = 'submitted';
    else if (it.isOptional) state = 'available';
    else if (opts.sequential && blocked) state = 'locked';
    else if (!currentSet) {
      state = 'current';
      currentSet = true;
    } else state = 'available';
    if (!it.isOptional) {
      number += 1;
      if (!finished) blocked = true;
    }
    return { item: it, state, number: it.isOptional ? null : number };
  });
  // ardıcıl olmayan rejimdə də «cari» yalnız bir addımdır: ilk tamamlanmamış məcburi
  const cur = items.find((x) => x.state === 'current');
  const continueItem = cur?.item ?? required.find((i) => !isItemDone(i)) ?? null;
  return { items, done, total, percent, isComplete, continueItem };
}
