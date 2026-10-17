'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, Ban, CalendarClock, Pencil, Rocket, Trash2 } from 'lucide-react';
import type { AcademyAction, AcademyAssignmentDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

/** Dərc / planlaşdırma / ləğv / arxiv / qaralamanı silmək — düymələr icazəyə görə (server yenə yoxlayır) */
export function AssignmentActions({
  a,
  permissions,
}: {
  a: AcademyAssignmentDto;
  permissions: AcademyAction[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'cancel' | 'delete'>(null);
  const can = (x: AcademyAction) => permissions.includes(x);
  const future = new Date(a.availableAt).getTime() > Date.now();

  async function run(key: string, fn: () => Promise<unknown>, okMsg: string, then?: () => void) {
    setBusy(key);
    try {
      await fn();
      toast.success(okMsg);
      setConfirm(null);
      if (then) then();
      else router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const editable =
    a.status === 'DRAFT'
      ? can('assignment.editDraft')
      : a.status !== 'ARCHIVED' && a.status !== 'CANCELLED' && can('assignment.editPublished');
  return (
    <div className="flex flex-wrap gap-2" data-testid="assignment-actions">
      {editable ? (
        <Link href={`/muellim/tapsiriqlar/${a.id}/redakte`} className="b b-ghost b-sm">
          <Pencil aria-hidden />
          {t('academy.teacher.edit')}
        </Link>
      ) : null}
      {a.status === 'DRAFT' && can('assignment.publish') ? (
        <>
          <Button
            size="sm"
            loading={busy === 'now'}
            onClick={() =>
              run(
                'now',
                () =>
                  api(`/academy/assignments/${a.id}/publish`, {
                    method: 'POST',
                    body: { mode: 'now' },
                  }),
                t('academy.teacher.published'),
              )
            }
            data-testid="publish-now"
          >
            <Rocket className="size-4" />
            {t('academy.teacher.publishNow')}
          </Button>
          {future ? (
            <Button
              size="sm"
              variant="navy"
              loading={busy === 'scheduled'}
              onClick={() =>
                run(
                  'scheduled',
                  () =>
                    api(`/academy/assignments/${a.id}/publish`, {
                      method: 'POST',
                      body: { mode: 'scheduled' },
                    }),
                  t('academy.form.saved'),
                )
              }
            >
              <CalendarClock className="size-4" />
              {t('academy.teacher.publishScheduled')}
            </Button>
          ) : null}
        </>
      ) : null}
      {a.status === 'DRAFT' && can('assignment.editDraft') ? (
        <Button size="sm" variant="danger" onClick={() => setConfirm('delete')}>
          <Trash2 className="size-4" />
          {t('academy.teacher.deleteDraft')}
        </Button>
      ) : null}
      {(a.status === 'PUBLISHED' || a.status === 'SCHEDULED') && can('assignment.cancel') ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            loading={busy === 'archive'}
            onClick={() =>
              run(
                'archive',
                () => api(`/academy/assignments/${a.id}/archive`, { method: 'POST', body: {} }),
                t('academy.form.saved'),
              )
            }
          >
            <Archive className="size-4" />
            {t('academy.teacher.archive')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirm('cancel')}>
            <Ban className="size-4" />
            {t('academy.teacher.cancel')}
          </Button>
        </>
      ) : null}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent
          tone="danger"
          title={
            confirm === 'delete' ? t('academy.teacher.deleteDraft') : t('academy.teacher.cancel')
          }
          description={
            confirm === 'delete'
              ? t('academy.teacher.deleteConfirm')
              : t('academy.teacher.cancelConfirm')
          }
        >
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="dangerSolid"
              loading={busy === 'confirm'}
              onClick={() =>
                confirm === 'delete'
                  ? run(
                      'confirm',
                      () => api(`/academy/assignments/${a.id}`, { method: 'DELETE' }),
                      t('academy.form.saved'),
                      () => router.push(`/muellim/qruplar/${a.groupId}`),
                    )
                  : run(
                      'confirm',
                      () =>
                        api(`/academy/assignments/${a.id}/cancel`, { method: 'POST', body: {} }),
                      t('academy.form.saved'),
                    )
              }
            >
              {confirm === 'delete'
                ? t('academy.teacher.deleteDraft')
                : t('academy.teacher.cancel')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
