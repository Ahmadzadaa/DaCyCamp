import { env } from '../config/env';

/** Verilən anın APP_TIMEZONE-dakı təqvim günü: "YYYY-MM-DD" */
export function dayKey(d = new Date(), tz = env.APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
/** "YYYY-MM-DD" → @db.Date sütunu üçün UTC gecəyarısı */
export const dayToDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
export const dateToDay = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(key: string, n: number): string {
  const d = dayToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToDay(d);
}
/** Bazar ertəsindən başlayan həftənin 7 günü (APP_TIMEZONE) */
export function weekDays(today = dayKey()): string[] {
  const d = dayToDate(today);
  const dow = (d.getUTCDay() + 6) % 7; // B.e = 0
  const monday = addDays(today, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
