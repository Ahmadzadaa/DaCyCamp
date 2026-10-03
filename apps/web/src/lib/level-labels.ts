import { cache } from 'react';
import { az, type Level, type LevelLabels } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';

export const DEFAULT_LEVEL_LABELS: LevelLabels = { ...az.level };

/** Admin-in dəyişdiyi səviyyə adları (sorğu başına bir dəfə oxunur) */
export const getLevelLabels = cache(async (): Promise<LevelLabels> => {
  const r = await apiTry<Partial<LevelLabels>>('/settings/levels');
  return { ...DEFAULT_LEVEL_LABELS, ...(r ?? {}) };
});

export const levelName = (labels: LevelLabels, l: Level) => labels[l] ?? az.level[l];
