'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import { az, type AuditLogDto, type AuditPageDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/empty-state';
import { fmtDate } from './format';

const FILTERS = Object.keys(az.audit.filter) as Array<keyof typeof az.audit.filter>;

/** "course.purge.auto" → "kurs avtomatik həmişəlik silindi" (lüğətdə yoxdursa kodun özü) */
function actionLabel(action: string): string {
  const key = action.replace(/\./g, '_') as keyof typeof az.audit.actions;
  return az.audit.actions[key] ?? action;
}

function detailText(d: AuditLogDto['details'], title: string | null): string | null {
  if (!d) return null;
  const parts: string[] = [];
  if (typeof d.email === 'string') parts.push(d.email);
  if (typeof d.stepTitle === 'string') parts.push(`«${d.stepTitle}»`);
  if (typeof d.isPublished === 'boolean')
    parts.push(d.isPublished ? t('courseAdmin.status.published') : t('courseAdmin.status.draft'));
  if (typeof d.archived === 'boolean')
    parts.push(d.archived ? t('courseAdmin.status.archived') : t('courseAdmin.unarchive'));
  if (typeof d.role === 'string') parts.push(d.role);
  if (typeof d.path === 'string' && d.path !== title) parts.push(d.path);
  if (typeof d.slug === 'string') parts.push(d.slug);
  if (d.force) parts.push('force');
  return parts.length ? parts.join(' · ') : null;
}

/** Fəaliyyət tarixçəsi: kim, nəyi, nə vaxt (cursor ilə "Daha çox") */
export function AuditLog({ courseId, compact }: { courseId?: string; compact?: boolean }) {
  const [items, setItems] = useState<AuditLogDto[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchPage = useCallback(
    async (after: string | null) => {
      const qs = new URLSearchParams({ limit: '30' });
      if (courseId) qs.set('courseId', courseId);
      if (filter) qs.set('action', `${filter}.`);
      if (after) qs.set('cursor', after);
      return api<AuditPageDto>(`/admin/audit?${qs}`);
    },
    [courseId, filter],
  );

  useEffect(() => {
    setItems(null);
    fetchPage(null)
      .then((p) => {
        setItems(p.items);
        setCursor(p.nextCursor);
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [fetchPage]);

  async function more() {
    if (!cursor) return;
    setBusy(true);
    try {
      const p = await fetchPage(cursor);
      setItems((xs) => [...(xs ?? []), ...p.items]);
      setCursor(p.nextCursor);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="audit-log">
      {!compact ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl">{t('audit.title')}</h1>
            <p className="mt-1 text-sm text-muted">{t('audit.subtitle')}</p>
          </div>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t('audit.what')}
            className="max-w-56"
          >
            <option value="">{t('audit.filterAll')}</option>
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {t(`audit.filter.${f}`)}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {items === null ? (
        <div className="card flex flex-col gap-3 p-5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={History} title={t('audit.empty')} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl-admin tbl-hover">
            <thead>
              <tr>
                <th>{t('audit.when')}</th>
                <th>{t('audit.who')}</th>
                <th>{t('audit.what')}</th>
                <th>{t('audit.object')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} data-action={it.action}>
                  <td className="whitespace-nowrap text-muted">{fmtDate(it.createdAt, true)}</td>
                  <td>
                    <b className="block text-sm">
                      {it.actor.id ? (it.actor.name ?? it.actor.email) : t('audit.system')}
                    </b>
                    {it.actor.id ? (
                      <span className="text-xs text-muted">{it.actor.email}</span>
                    ) : null}
                  </td>
                  <td>{actionLabel(it.action)}</td>
                  <td>
                    {it.entityTitle ? <span className="font-medium">{it.entityTitle}</span> : '—'}
                    {detailText(it.details, it.entityTitle) ? (
                      <div className="text-xs text-muted">
                        {detailText(it.details, it.entityTitle)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="ghost" loading={busy} onClick={more}>
            {t('audit.loadMore')}
          </Button>
        </div>
      ) : null}
      {!compact ? (
        <p className="text-xs text-muted">
          <Link href="/admin/kurslar" className="hover:underline">
            ← {t('admin.courses')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
