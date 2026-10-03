import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, FileText, Route, Search, Users } from 'lucide-react';
import type { AdminSearchDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { initials } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { TrackBadge } from '@/components/app/track-badge';
import { CourseStatusBadge } from '@/components/admin/course-actions';

export const metadata: Metadata = { title: `${t('adminSearch.title')} · ${t('app.admin')}` };

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const r = await apiFetch<AdminSearchDto>(`/admin/search?q=${encodeURIComponent(q)}`);
  const total = r.courses.length + r.users.length + r.assets.length + r.paths.length;
  return (
    <div className="flex flex-col gap-6">
      <div className="ph1 !mb-0">
        <div>
          <h1>{t('adminSearch.title')}</h1>
          <p>{r.q.length >= 2 ? t('adminSearch.resultsFor', { q: r.q }) : t('adminSearch.hint')}</p>
        </div>
      </div>
      {r.q.length >= 2 && total === 0 ? (
        <EmptyState
          icon={Search}
          title={t('adminSearch.none')}
          description={t('adminSearch.noneHint')}
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        {r.courses.length ? (
          <section className="box">
            <h2 className="box-h">
              <BookOpen aria-hidden />
              {t('adminSearch.courses')}
            </h2>
            <ul className="res-list">
              {r.courses.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={
                      c.status === 'deleted'
                        ? '/admin/kurslar?status=deleted'
                        : `/admin/kurslar/${c.slug}`
                    }
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{c.title}</b>
                      <span className="font-mono text-xs text-muted">{c.slug}</span>
                    </span>
                    <TrackBadge color={c.trackColor}>{c.trackTitle}</TrackBadge>
                    <CourseStatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {r.users.length ? (
          <section className="box">
            <h2 className="box-h">
              <Users aria-hidden />
              {t('adminSearch.users')}
            </h2>
            <ul className="res-list">
              {r.users.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/telebeler?q=${encodeURIComponent(u.email)}`}>
                    <span className="avatar sm">{initials(u.name)}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{u.name}</b>
                      <span className="text-xs text-muted">{u.email}</span>
                    </span>
                    <span className="badge badge-muted">{t(`role.${u.role}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {r.assets.length ? (
          <section className="box">
            <h2 className="box-h">
              <FileText aria-hidden />
              {t('adminSearch.files')}
            </h2>
            <ul className="res-list">
              {r.assets.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/kurslar/${a.courseSlug}?tab=fayllar`}>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate font-mono text-[0.88rem]">{a.path}</b>
                      <span className="text-xs text-muted">{a.courseTitle}</span>
                    </span>
                    <span className="badge badge-muted">{a.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {r.paths.length ? (
          <section className="box">
            <h2 className="box-h">
              <Route aria-hidden />
              {t('adminSearch.paths')}
            </h2>
            <ul className="res-list">
              {r.paths.map((p) => (
                <li key={p.slug}>
                  <Link href={`/admin/yollar/${p.slug}`}>
                    <span className="cdot-lg" style={{ background: p.trackColor }} aria-hidden />
                    <b className="min-w-0 flex-1 truncate">{p.title}</b>
                    <span className={`badge ${p.isPublished ? 'badge-ok' : 'badge-muted'}`}>
                      <span className="bdot" aria-hidden />
                      {p.isPublished ? t('common.published') : t('common.draft')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
