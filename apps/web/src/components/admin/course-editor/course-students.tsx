'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LockOpen, MoreHorizontal, RotateCcw, UserMinus, Users, X } from 'lucide-react';
import type { AdminCourseStudentDto, AdminModuleNode } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/app/empty-state';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown';
import { ConfirmDialog } from '../confirm-dialog';
import { fmtDate } from '../format';

type Pending =
  | { kind: 'reset' | 'remove'; s: AdminCourseStudentDto }
  | { kind: 'unlock'; s: AdminCourseStudentDto };

/** Kursa yazılan tələbələr: irəliləyiş, son aktivlik, çıxar / sıfırla / kilidi əl ilə aç (yalnız ADMIN) */
export function CourseStudents({
  courseId,
  modules,
}: {
  courseId: string;
  modules: AdminModuleNode[];
}) {
  const [rows, setRows] = useState<AdminCourseStudentDto[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stepTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modules) for (const s of mod.steps) m.set(s.id, `${mod.title} › ${s.title}`);
    return m;
  }, [modules]);

  const load = useCallback(() => {
    api<AdminCourseStudentDto[]>(`/admin/courses/${courseId}/students`)
      .then(setRows)
      .catch((e) => toast.error(errorMessage(e)));
  }, [courseId]);
  useEffect(load, [load]);

  const base = `/admin/courses/${courseId}/students`;

  async function reEnroll(s: AdminCourseStudentDto) {
    try {
      await api(`${base}/${s.userId}`, { method: 'POST' });
      toast.success(t('courseAdmin.reEnrolled'));
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function confirmPending(stepId?: string) {
    if (!pending) return;
    const s = pending.s;
    setError(null);
    try {
      if (pending.kind === 'remove') {
        await api(`${base}/${s.userId}`, { method: 'DELETE' });
        toast.success(t('courseAdmin.removed'), {
          description: s.email,
          duration: 10_000,
          action: { label: t('courseAdmin.undo'), onClick: () => void reEnroll(s) },
        });
      } else if (pending.kind === 'reset') {
        await api(`${base}/${s.userId}/reset`, { method: 'POST' });
        toast.success(t('courseAdmin.resetDone'), { description: s.email });
      } else if (stepId) {
        await api(`${base}/${s.userId}/unlock`, { method: 'POST', body: { stepId } });
        toast.success(t('courseAdmin.unlocked', { step: stepTitle.get(stepId) ?? '' }));
      }
      setPending(null);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function relock(s: AdminCourseStudentDto, stepId: string) {
    try {
      await api(`${base}/${s.userId}/unlock/${stepId}`, { method: 'DELETE' });
      toast.success(t('courseAdmin.relocked', { step: stepTitle.get(stepId) ?? '' }));
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (!rows)
    return (
      <div className="card flex flex-col gap-3 p-5" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (rows.length === 0) return <EmptyState icon={Users} title={t('courseAdmin.noStudents')} />;

  return (
    <div className="tbl-wrap" data-testid="course-students">
      <table className="tbl-admin">
        <thead>
          <tr>
            <th>{t('admin.students')}</th>
            <th>{t('courseAdmin.progress')}</th>
            <th>{t('courseAdmin.lastActivity')}</th>
            <th>{t('courseAdmin.enrolledAt')}</th>
            <th className="text-right">{t('courseAdmin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.userId} data-testid={`student-row-${s.email}`}>
              <td>
                <b className="block">{s.name}</b>
                <span className="text-xs text-muted">{s.email}</span>
                {s.unlockedStepIds.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.unlockedStepIds.map((id) => (
                      <span
                        key={id}
                        className="badge badge-muted inline-flex items-center gap-1"
                        title={t('courseAdmin.manual')}
                      >
                        <LockOpen className="size-3" />
                        {stepTitle.get(id) ?? id}
                        <button
                          type="button"
                          className="ml-0.5 rounded hover:text-error"
                          onClick={() => relock(s, id)}
                          aria-label={`${t('courseAdmin.relock')}: ${stepTitle.get(id) ?? id}`}
                          title={t('courseAdmin.relock')}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="meter w-28" aria-hidden>
                    <i style={{ width: `${s.percent}%` }} />
                  </div>
                  <span className="text-sm tabular-nums" data-testid="student-percent">
                    {s.percent}%
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {s.done} / {s.total}
                </span>
              </td>
              <td className="text-muted">{fmtDate(s.lastActivityAt)}</td>
              <td className="text-muted">{fmtDate(s.enrolledAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="b b-ghost b-sm"
                    disabled={s.lockedStepIds.length === 0}
                    onClick={() => {
                      setError(null);
                      setPending({ kind: 'unlock', s });
                    }}
                    title={
                      s.lockedStepIds.length ? t('courseAdmin.unlock') : t('courseAdmin.noLocked')
                    }
                  >
                    <LockOpen className="size-4" />
                    {t('courseAdmin.unlock')}
                  </button>
                  <Dropdown>
                    <DropdownTrigger
                      className="iconbtn"
                      aria-label={`${t('courseAdmin.more')}: ${s.email}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownTrigger>
                    <DropdownContent>
                      <DropdownItem
                        onSelect={() => {
                          setError(null);
                          setPending({ kind: 'reset', s });
                        }}
                      >
                        <RotateCcw className="size-4" /> {t('courseAdmin.reset')}
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        className="text-error"
                        onSelect={() => {
                          setError(null);
                          setPending({ kind: 'remove', s });
                        }}
                      >
                        <UserMinus className="size-4" /> {t('courseAdmin.remove')}
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={pending?.kind === 'reset' || pending?.kind === 'remove'}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === 'reset'
            ? t('courseAdmin.resetTitle', { name: pending.s.name })
            : t('courseAdmin.removeTitle', { name: pending?.s.name ?? '' })
        }
        description={
          pending?.kind === 'reset' ? t('courseAdmin.resetDesc') : t('courseAdmin.removeDesc')
        }
        confirmLabel={pending?.kind === 'reset' ? t('courseAdmin.reset') : t('courseAdmin.remove')}
        onConfirm={() => confirmPending()}
        error={error}
      />
      {pending?.kind === 'unlock' ? (
        <UnlockDialog
          student={pending.s}
          stepTitle={stepTitle}
          error={error}
          onClose={() => setPending(null)}
          onConfirm={(stepId) => confirmPending(stepId)}
        />
      ) : null}
    </div>
  );
}

function UnlockDialog({
  student,
  stepTitle,
  error,
  onClose,
  onConfirm,
}: {
  student: AdminCourseStudentDto;
  stepTitle: Map<string, string>;
  error: string | null;
  onClose: () => void;
  onConfirm: (stepId: string) => Promise<void>;
}) {
  const [stepId, setStepId] = useState(student.lockedStepIds[0] ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t('courseAdmin.unlockTitle', { name: student.name })}
        description={t('courseAdmin.unlockDesc')}
      >
        <div className="flex flex-col gap-4">
          <label className="fld">
            <span className="lbl">{t('courseAdmin.unlockStep')}</span>
            <Select value={stepId} onChange={(e) => setStepId(e.target.value)}>
              {student.lockedStepIds.map((id) => (
                <option key={id} value={id}>
                  {stepTitle.get(id) ?? id}
                </option>
              ))}
            </Select>
          </label>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {error}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!stepId}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm(stepId);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LockOpen className="size-4" />
              {t('courseAdmin.unlock')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
