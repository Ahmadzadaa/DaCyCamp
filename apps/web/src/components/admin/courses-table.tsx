import Link from 'next/link';
import type { AdminCourseDto, TrackDto } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TrackBadge } from '@/components/app/track-badge';
import { EmptyState } from '@/components/app/empty-state';
import { BookOpen, Plus } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { fmtDate } from './format';

export function CoursesTable({
  courses,
  tracks,
  track,
  q,
}: {
  courses: AdminCourseDto[];
  tracks: TrackDto[];
  track?: string;
  q?: string;
}) {
  const href = (patch: { istiqamet?: string; q?: string }) => {
    const p = new URLSearchParams();
    const merged = { istiqamet: track, q, ...patch };
    if (merged.istiqamet) p.set('istiqamet', merged.istiqamet);
    if (merged.q) p.set('q', merged.q);
    const s = p.toString();
    return `/admin/kurslar${s ? `?${s}` : ''}`;
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">{t('admin.courses')}</h1>
        <span className="flex-1" />
        <form action="/admin/kurslar" className="flex gap-2">
          {track ? <input type="hidden" name="istiqamet" value={track} /> : null}
          <input
            name="q"
            defaultValue={q}
            className="inp max-w-xs"
            placeholder={t('common.search')}
            aria-label={t('common.search')}
          />
        </form>
        <Link href="/admin/kurslar/yeni" className="b b-brand">
          <Plus className="size-4" />
          {t('admin.newCourse')}
        </Link>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={t('common.track')}>
        <Link href={href({ istiqamet: undefined })} className={cn('chip', !track && 'on')}>
          {t('common.all')}
        </Link>
        {tracks.map((tr) => (
          <Link
            key={tr.slug}
            href={href({ istiqamet: track === tr.slug ? undefined : tr.slug })}
            className={cn('chip', track === tr.slug && 'on')}
          >
            {tr.title}
          </Link>
        ))}
      </nav>
      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('admin.noCourses')}
          action={
            <Link href="/admin/kurslar/yeni" className="b b-brand">
              {t('admin.newCourse')}
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl-admin">
            <thead>
              <tr>
                <th>{t('common.title')}</th>
                <th>{t('common.track')}</th>
                <th>{t('common.level')}</th>
                <th>{t('common.status')}</th>
                <th>{t('admin.enrollments')}</th>
                <th>{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/admin/kurslar/${c.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {c.title}
                    </Link>
                    <div className="font-mono text-xs text-muted">{c.slug}</div>
                  </td>
                  <td>
                    <TrackBadge color={c.track.color}>{c.track.title}</TrackBadge>
                  </td>
                  <td>{t(`level.${c.level}`)}</td>
                  <td>
                    <StatusBadge published={c.isPublished} />
                  </td>
                  <td>{c.enrollmentCount}</td>
                  <td className="text-muted">{fmtDate(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
