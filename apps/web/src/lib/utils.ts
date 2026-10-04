import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLocale } from './i18n';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';
export const fmtHours = (h: number | null | undefined) =>
  h == null ? null : Number.isInteger(h) ? String(h) : h.toFixed(1);
/** Rəqəm minliklərə bölünür: 2340 → «2 340» (bölünməz boşluq) */
export const fmtNum = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, getLocale() === 'en' ? ',' : '\u00a0');
/** Addın birinci hissəsi: «Orxan Rəhimov» → «Orxan» */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
