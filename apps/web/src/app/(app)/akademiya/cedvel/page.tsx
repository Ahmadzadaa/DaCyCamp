import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarClock, Video } from 'lucide-react';
import type { AcademySessionDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { ClassStatusBadge } from '@/components/academy/badges';
import { fmtZoned } from '@/components/academy/format';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.tabs.schedule')} · ${t('academy.title')}` };
}

const DAY = 86_400_000;

/** Dərs cədvəli: qarşıdakı 30 gün və ya keçmiş 60 gün; görüş linki yalnız aktiv yazılışda */
export default async function MySchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ kecmis?: string }>;
}) {
  const past = (await searchParams).kecmis === '1';
  const now = Date.now();
  const from = new Date(past ? now - 60 * DAY : now - DAY).toISOString();
  const to = new Date(past ? now : now + 30 * DAY).toISOString();
  const rows = await apiTry<AcademySessionDto[]>(
    `/academy/me/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!rows) notFound();
  const list = past ? [...rows].reverse() : rows;
  const days = new Map<string, AcademySessionDto[]>();
  for (const s of list) {
    const k = fmtZoned(s.startsAt, { time: false });
    days.set(k, [...(days.get(k) ?? []), s]);
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="h2">{past ? t('academy.sessions.past') : t('academy.sessions.upcoming')}</h2>
        <Link
          href={past ? '/akademiya/cedvel' : '/akademiya/cedvel?kecmis=1'}
          className="b b-ghost b-sm"
        >
          {past ? t('academy.sessions.showUpcoming') : t('academy.sessions.showPast')}
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t('academy.empty.schedule')} />
      ) : (
        <section className="box" data-testid="academy-schedule">
          {[...days.entries()].map(([day, items]) => (
            <div key={day}>
              <div className="ac-day">{day}</div>
              <ul className="sup-list">
                {items.map((s) => (
                  <li key={s.id} className="ac-row py-3">
                    <span className="flex min-w-0 flex-col gap-1">
                      <b className={s.status === 'CANCELLED' ? 'line-through' : undefined}>
                        {s.title}
                      </b>
                      <span className="ac-meta">
                        <span>{s.groupCode}</span>
                        <span>
                          {fmtZoned(s.startsAt).split(', ')[1]}–{fmtZoned(s.endsAt).split(', ')[1]}
                        </span>
                        {s.instructor ? <span>{s.instructor.name}</span> : null}
                      </span>
                    </span>
                    <span className="ac-side">
                      {s.status !== 'SCHEDULED' ? <ClassStatusBadge status={s.status} /> : null}
                      {s.meetingUrl && !past ? (
                        <a
                          href={s.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="b b-brand b-xs"
                        >
                          <Video aria-hidden />
                          {t('academy.overview.join')}
                        </a>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
