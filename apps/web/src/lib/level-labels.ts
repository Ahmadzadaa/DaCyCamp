import { cache } from 'react';
import { az, type Level, type LevelLabels } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { getLocale, t } from '@/lib/i18n';

export const DEFAULT_LEVEL_LABELS: LevelLabels = { ...az.level };

/** Admin-in saxladığı səviyyə adları (azərbaycanca; sorğu başına bir dəfə oxunur) — redaktor üçün */
export const getStoredLevelLabels = cache(async (): Promise<LevelLabels> => {
  const r = await apiTry<Partial<LevelLabels>>('/settings/levels');
  return { ...DEFAULT_LEVEL_LABELS, ...(r ?? {}) };
});

/**
 * Göstəriş üçün səviyyə adları: az — admin-in fərdi adları; en — lüğətdəki ingiliscə adlar
 * (fərdi adlar azərbaycanca yazılır, ingilis interfeysində qarışıq görünməsin).
 */
export const getLevelLabels = cache(async (): Promise<LevelLabels> => {
  if (getLocale() === 'en') {
    return {
      BEGINNER: t('level.BEGINNER'),
      INTERMEDIATE: t('level.INTERMEDIATE'),
      ADVANCED: t('level.ADVANCED'),
    };
  }
  return getStoredLevelLabels();
});

export const levelName = (labels: LevelLabels, l: Level) => labels[l] ?? az.level[l];
