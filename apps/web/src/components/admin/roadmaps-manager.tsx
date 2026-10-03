'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ExternalLink, Map, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminRoadmapDto, RoadmapInput } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { PageHeader } from './page-header';
import { ConfirmDialog } from './confirm-dialog';
import { fmtDate } from './format';

/** Yeni xəritə üçün minimal şablon (redaktorda doldurulur) */
function template(n: number): RoadmapInput {
  const slug = `yeni-xerite-${n}`;
  return {
    slug,
    title: t('roadmap.adminNew'),
    tagline: null,
    description: null,
    track: null,
    isPublished: false,
    content: {
      levels: ['intern', 'junior', 'middle', 'senior'].map((key) => ({
        key,
        title: key[0]!.toUpperCase() + key.slice(1),
        summary: '—',
        expectations: [],
        tools: [],
        groups: [
          {
            title: t('roadmap.newGroup'),
            skills: [{ id: `${slug}-${key}-1`, title: t('roadmap.newSkill'), core: true }],
          },
        ],
      })),
    },
  };
}

/** Admin: karyera xəritələrinin siyahısı — yarat, sırala, redaktəyə keç, sil */
export function RoadmapsManager({ initial }: { initial: AdminRoadmapDto[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<AdminRoadmapDto | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    try {
      const r = await api<AdminRoadmapDto>('/admin/roadmaps', {
        method: 'POST',
        body: template(Date.now() % 100000),
      });
      toast.success(t('roadmap.adminCreated'));
      router.push(`/admin/karyera/${r.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...rows];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setRows(next);
    try {
      await api('/admin/roadmaps/reorder', {
        method: 'PATCH',
        body: { ids: next.map((r) => r.id) },
      });
    } catch (e) {
      setRows(rows);
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!del) return;
    setDelError(null);
    try {
      await api(`/admin/roadmaps/${del.id}`, { method: 'DELETE' });
      setRows((r) => r.filter((x) => x.id !== del.id));
      setDel(null);
      toast.success(t('roadmap.adminDeleted'));
    } catch (e) {
      setDelError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('roadmap.adminTitle')} subtitle={t('roadmap.adminSubtitle')}>
        <Button type="button" onClick={create} loading={busy} data-testid="roadmap-new">
          <Plus aria-hidden />
          {t('roadmap.adminNew')}
        </Button>
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyState icon={Map} title={t('roadmap.empty')} />
      ) : (
        <div className="tbl-wrap">
          <ul className="topic-list" data-testid="roadmaps-list">
            {rows.map((r, i) => (
              <li key={r.id} data-testid={`roadmap-row-${r.slug}`}>
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="ib"
                    aria-label={t('roadmap.moveUp')}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ib"
                    aria-label={t('roadmap.moveDown')}
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown aria-hidden />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/karyera/${r.id}`} className="font-bold hover:underline">
                      {r.title}
                    </Link>
                    <span className={r.isPublished ? 'badge badge-ok' : 'badge badge-muted'}>
                      {r.isPublished ? t('topics.published') : t('topics.hidden')}
                    </span>
                  </div>
                  <span className="text-xs text-muted">
                    <code className="font-mono">{r.slug}</code> ·{' '}
                    {t('roadmap.adminLevels', { n: r.content.levels.length })} ·{' '}
                    {t('roadmap.adminSkills', { n: r.skillCount })} · {fmtDate(r.updatedAt)}
                  </span>
                </div>
                <Link
                  href={`/yollar?karyera=${r.slug}`}
                  className="ib"
                  target="_blank"
                  aria-label={t('roadmap.adminView')}
                  title={t('roadmap.adminView')}
                >
                  <ExternalLink aria-hidden />
                </Link>
                <Link
                  href={`/admin/karyera/${r.id}`}
                  className="ib"
                  aria-label={t('roadmap.adminEdit')}
                  title={t('roadmap.adminEdit')}
                >
                  <Pencil aria-hidden />
                </Link>
                <button
                  type="button"
                  className="ib"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  onClick={() => {
                    setDelError(null);
                    setDel(r);
                  }}
                >
                  <Trash2 aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={t('roadmap.adminDeleteTitle', { title: del?.title ?? '' })}
        description={t('roadmap.adminDeleteDesc')}
        confirmText={del?.slug}
        error={delError}
        onConfirm={remove}
      />
    </div>
  );
}
