import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { AdminPathDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TrackBadge } from '@/components/app/track-badge';
import { StatusBadge } from '@/components/admin/status-badge';
import { PageHeader } from '@/components/admin/page-header';

export const metadata: Metadata = { title: `${t('admin.pathsTitle')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function AdminPathsPage() {
  const paths = await apiFetch<AdminPathDto[]>('/admin/paths');
  return (
    <div>
      <PageHeader title={t('admin.pathsTitle')} subtitle={t('admin.pathsDesc')}>
        <Link href="/admin/yollar/yeni" className="b b-brand" data-testid="new-path">
          <Plus aria-hidden /> {t('admin.newPath')}
        </Link>
      </PageHeader>
      {paths.length === 0 ? (
        <div className="box text-muted">{t('paths.empty')}</div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl-admin">
            <thead>
              <tr>
                <th>{t('common.title')}</th>
                <th>{t('common.track')}</th>
                <th>{t('admin.pathSteps')}</th>
                <th>{t('common.status')}</th>
                <th>{t('admin.enrollmentCount', { n: '' }).trim()}</th>
              </tr>
            </thead>
            <tbody>
              {paths.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/yollar/${p.slug}`} className="ttl hover:underline">
                      {p.title}
                    </Link>
                    <div className="slug">{p.slug}</div>
                  </td>
                  <td>
                    <TrackBadge color={p.track.color}>{p.track.title}</TrackBadge>
                  </td>
                  <td>
                    {p.itemCount} · {t('paths.courses', { n: p.courseCount })}
                    {p.issues.length ? (
                      <span className="ml-2 text-xs text-error">{p.issues.length} ⚠</span>
                    ) : null}
                  </td>
                  <td>
                    <StatusBadge published={p.isPublished} />
                  </td>
                  <td>{p.enrollmentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
