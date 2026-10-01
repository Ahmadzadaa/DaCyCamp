import { t as sharedT, tList as sharedTList, type TKey } from '@dacy/shared';
/** Hələlik yalnız az; dil seçimi gələndə cookie-dən oxunacaq */
export const t = (key: TKey, params?: Record<string, string | number>) =>
  sharedT(key, params, 'az');
export const tList = (key: TKey) => sharedTList(key, 'az');
export type { TKey };
