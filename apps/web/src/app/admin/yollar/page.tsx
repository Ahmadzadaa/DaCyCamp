import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { AdminPathDto } from '@dacy/shared';
import { apiFetch } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TrackBadge } from '@/components/app/track-badge';
import { StatusBadge } from '@/components/admin/status-badge';

export const metadata: Metadata = { title: `${t('admin.pathsTitle')} · ${t('app.admin')}` };
export const dynamic = 'force-dynamic';

export default async function AdminPathsPage() {
  const paths = await apiFetch<AdminPathDto[]>('/admin/paths');
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl">{t('admin.pathsTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('admin.pathsDesc')}</p>
        </div>
        <Link href="/admin/yollar/yeni" className="b b-brand ml-auto" data-testid="new-path">
          <Plus className="size-4" /> {t('admin.newPath')}
        </Link>
      </div>
      {paths.length === 0 ? (
        <div className="box text-muted">{t('paths.empty')}</div>
      ) : (
        <div className="box overflow-x-auto p-0">
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
                    <Link
                      href={`/admin/yollar/${p.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="font-mono text-xs text-muted">{p.slug}</div>
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
