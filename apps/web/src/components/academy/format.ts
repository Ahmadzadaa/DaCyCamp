import { ACADEMY_DEFAULTS } from '@dacy/shared';
import { t } from '@/lib/i18n';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Tarix və saat verilən vaxt zonasında (defolt — akademiyanın zonası, Asia/Baku). Server komponentində də
 * brauzerdə də eyni nəticə verir (serverin öz saat qurşağından asılı deyil). Ay adları lüğətdən.
 */
export function fmtZoned(
  iso: string | null | undefined,
  opts: { tz?: string; time?: boolean; weekday?: boolean } = {},
): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: opts.tz ?? ACADEMY_DEFAULTS.timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const n = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  const months = t('dates.months').split(',');
  const date = `${n('day')} ${months[n('month') - 1] ?? n('month')} ${n('year')}`;
  return opts.time === false ? date : `${date}, ${pad(n('hour'))}:${pad(n('minute'))}`;
}

/** Bal: lazımsız onluq sıfırlar olmadan (43.5, 50) */
export const fmtScore = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : String(Math.round(n * 100) / 100);

export const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${n}%`;

/** <input type="datetime-local"> dəyəri (brauzerin yerli vaxtı) ↔ ISO */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Yeni idempotency açarı (göndəriş formu bir dəfə yaradır; təkrar klik eyni açarı göndərir) */
export function newIdempotencyKey(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web-${rnd}`.replace(/[^A-Za-z0-9_-]/g, '');
}
