'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { History } from 'lucide-react';
import type { ClassroomLessonDto, ClassroomPage, ClassroomRevisionDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Markdown } from '@/components/app/markdown';
import { fmtZoned } from '@/components/academy/format';

export function RevisionHistory({
  kind,
  id,
  version,
  onLessonRestored,
}: {
  kind: 'lesson' | 'announcement';
  id: string;
  version: number;
  onLessonRestored?: (lesson: ClassroomLessonDto) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ClassroomPage<ClassroomRevisionDto> | null>(null);
  const [selected, setSelected] = useState<ClassroomRevisionDto | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `/academy/classroom/${kind === 'lesson' ? 'lessons' : 'announcements'}/${id}`;
  async function load(page = 1) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<ClassroomPage<ClassroomRevisionDto>>(`${path}/history?page=${page}`);
      setData(result);
      setSelected(result.items[0] ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const restored = await api<ClassroomLessonDto | { id: string }>(`${path}/restore`, {
        method: 'POST',
        body: { revisionId: selected.id, expectedVersion: version },
      });
      if (kind === 'lesson' && 'version' in restored) onLessonRestored?.(restored);
      setConfirm(false);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        <History className="size-4" />
        {t('reliability.history')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cr-editor-dialog"
          title={t('reliability.history')}
          description={t('reliability.historyHint')}
        >
          {busy ? <p role="status">{t('common.loading')}</p> : null}
          {error && !confirm ? (
            <p role="alert" className="cr-inline-error">
              {error}
            </p>
          ) : null}
          {data?.items.length === 0 ? <p>{t('reliability.noHistory')}</p> : null}
          <div className="flex flex-wrap gap-2">
            {data?.items.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={selected?.id === item.id ? 'brand' : 'outline'}
                size="sm"
                onClick={() => setSelected(item)}
              >
                {t('reliability.version')} {item.version}
              </Button>
            ))}
          </div>
          {selected ? (
            <section className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-muted">
                {selected.actorName} · {fmtZoned(selected.createdAt)}
              </p>
              <h3 className="text-xl font-bold">{String(selected.snapshot.title ?? '')}</h3>
              <div className="max-h-[40vh] overflow-auto rounded-xl border border-line p-4">
                <Markdown
                  content={String(selected.snapshot.content ?? selected.snapshot.body ?? '')}
                />
              </div>
              <Button
                type="button"
                disabled={busy || selected.version === version}
                onClick={() => setConfirm(true)}
              >
                {t('reliability.restore')}
              </Button>
            </section>
          ) : null}
          {data && data.total > data.pageSize ? (
            <div className="mt-4 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || data.page <= 1}
                onClick={() => void load(data.page - 1)}
              >
                ←
              </Button>
              <span>
                {data.page} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || data.page * data.pageSize >= data.total}
                onClick={() => void load(data.page + 1)}
              >
                →
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t('reliability.restoreTitle')}
        description={t('reliability.restoreHint')}
        confirmLabel={t('reliability.restore')}
        onConfirm={restore}
        error={error}
        danger={false}
      />
    </>
  );
}
