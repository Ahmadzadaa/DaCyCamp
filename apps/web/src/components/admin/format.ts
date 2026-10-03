import { t } from '@/lib/i18n';

const pad = (n: number) => String(n).padStart(2, '0');

/** Tarix: "2 okt 2026" (+ "14:05"); ay adları lüğətdən gəlir ki, Intl-də az lokalı olmayan brauzerlərdə də eyni görünsün. Boş dəyər üçün tire */
export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = t('dates.months').split(',');
  const date = `${d.getDate()} ${months[d.getMonth()] ?? d.getMonth() + 1} ${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

/** Nisbi vaxt: «indicə», «5 dəq əvvəl», «3 saat əvvəl», «dünən», «4 gün əvvəl», sonra tarix */
export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const min = Math.floor((now - d) / 60_000);
  if (min < 1) return t('ago.now');
  if (min < 60) return t('ago.min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('ago.hour', { n: h });
  const days = Math.floor(h / 24);
  if (days === 1) return t('ago.yesterday');
  if (days < 7) return t('ago.day', { n: days });
  return fmtDate(iso);
}

/** Lent üçün vaxt: bu gün → «14:02», dünən → «dünən», əks halda tarix */
export function fmtWhen(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, now)) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t('ago.yesterday');
  return fmtDate(iso);
}
