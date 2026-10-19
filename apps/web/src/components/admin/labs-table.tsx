'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Square } from 'lucide-react';
import type { AdminLabSessionDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { fmtCountdown } from '@/lib/labs';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function LabsTable({ initial }: { initial: AdminLabSessionDto[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  // qalan vaxt yalnız brauzerdə hesablanır: serverdəki Date.now() ilə hidratasiya anı fərqli saniyəyə düşəndə
  // React mətn uyğunsuzluğu (#418) verirdi
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    const t2 = setInterval(() => void refresh(), 10_000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  async function refresh() {
    try {
      setRows(await api<AdminLabSessionDto[]>('/admin/labs'));
    } catch {
      /* növbəti dəfə */
    }
  }

  async function stop(id: string) {
    setBusy(id);
    try {
      await api(`/admin/labs/${id}/stop`, { method: 'POST' });
      toast.success(t('admin.labStopped'));
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!rows.length) return <div className="box text-muted">{t('admin.labsEmpty')}</div>;
  return (
    <div className="tbl-wrap">
      <table className="tbl-admin">
        <thead>
          <tr>
            <th>{t('admin.labUser')}</th>
            <th>{t('admin.labStep')}</th>
            <th>{t('common.status')}</th>
            <th>{t('ws.labImage')}</th>
            <th>{t('admin.labExpires')}</th>
            <th>{t('admin.labDriver')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const remaining =
              now === null
                ? null
                : Math.max(0, Math.floor((new Date(r.expiresAt).getTime() - now) / 1000));
            return (
              <tr key={r.id}>
                <td>
                  <b>{r.user.name}</b>
                  <div className="text-xs text-muted">{r.user.email}</div>
                </td>
                <td>
                  <Link
                    href={`/admin/kurslar/${r.step.courseSlug}?node=step:${r.step.id}`}
                    className="hover:underline"
                  >
                    {r.step.title}
                  </Link>
                  <div className="text-xs text-muted">{r.step.courseTitle}</div>
                </td>
                <td>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                      r.status === 'PASSED'
                        ? 'tint-ok'
                        : r.status === 'RUNNING'
                          ? 'tint-da'
                          : 'bg-muted/20 text-muted',
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="font-mono text-xs">{r.image}</td>
                <td className="font-mono">{remaining === null ? '—' : fmtCountdown(remaining)}</td>
                <td>{r.driver}</td>
                <td className="text-right">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    loading={busy === r.id}
                    onClick={() => void stop(r.id)}
                  >
                    <Square className="size-3.5" /> {t('admin.labStop')}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
