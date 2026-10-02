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
