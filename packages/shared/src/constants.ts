import type { StepType } from './enums';

/** Platforma defoltları — müəllim hər addımda dəyişə bilər */
export const DEFAULT_XP: Record<StepType, number> = {
  THEORY: 10,
  QUIZ: 30,
  SQL: 50,
  PYTHON: 50,
  TERMINAL: 100,
  CTF: 150,
};
export const DEFAULT_PASS_SCORE = 70;
export const DEFAULT_HINT_PENALTY_XP = 10;
export const DEFAULT_LAB_MINUTES = 60;
export const CTF_MAX_ATTEMPTS_PER_MINUTE = 10;

export const COOKIE_ACCESS = 'dacy_at';
export const COOKIE_REFRESH = 'dacy_rt';
export const COOKIE_LOCALE = 'dacy_locale';

export const MAX_TITLE = 200;
export const MAX_SLUG = 80;

/** Dizayn faylındakı istiqamət rəngləri — yalnız seed üçün, UI bazadan oxuyur */
export const DEFAULT_TRACKS = [
  { slug: 'data-analytics', title: 'Data Analytics', color: '#6C7CF0', icon: 'bar-chart-3' },
  { slug: 'data-engineering', title: 'Data Engineering', color: '#F0A93E', icon: 'workflow' },
  { slug: 'cyber-security', title: 'Cyber Security', color: '#F06A8D', icon: 'shield' },
] as const;
