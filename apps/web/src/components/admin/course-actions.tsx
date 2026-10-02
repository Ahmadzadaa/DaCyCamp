'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  COURSE_TRASH_DAYS,
  type AdminCourseDto,
  type AdminCourseStatsDto,
  type CourseStatus,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

type CourseRef = Pick<AdminCourseDto, 'id' | 'slug' | 'title' | 'isPublished' | 'status'>;

/**
 * Kurs səviyyəsində əməliyyatlar (dərc, arxiv, surət, silmə, bərpa, həmişəlik silmə) — toast + "Geri qaytar".
 * `onChange` yenilənmiş kursu alır; verilməzsə səhifə serverdən yenilənir.
 */
export function useCourseActions(onChange?: (c: AdminCourseDto | null) => void) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const done = (c: AdminCourseDto | null) => {
    if (onChange) onChange(c);
    router.refresh();
  };

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    try {
      return await fn();
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function setPublished(c: CourseRef, isPublished: boolean) {
    const r = await run('publish', () =>
      api<AdminCourseDto>(`/admin/courses/${c.id}/publish`, {
        method: 'PATCH',
        body: { isPublished },
      }),
    );
    if (!r) return;
    toast.success(isPublished ? t('courseAdmin.published') : t('courseAdmin.unpublished'));
    done(r);
  }

  async function setArchived(c: CourseRef, archived: boolean, opts: { undo?: boolean } = {}) {
    const r = await run('archive', () =>
      api<AdminCourseDto>(`/admin/courses/${c.id}/archive`, {
        method: 'PATCH',
        body: { archived },
      }),
    );
    if (!r) return;
    if (archived)
      toast.success(t('courseAdmin.archived'), {
        description: t('courseAdmin.archivedHint'),
        action:
          opts.undo === false
            ? undefined
            : {
                label: t('courseAdmin.undo'),
                onClick: () => void setArchived(c, false, { undo: false }),
              },
      });
    else toast.success(t('courseAdmin.unarchived'));
    done(r);
  }

  async function copy(c: CourseRef) {
    const r = await run('copy', () =>
      api<AdminCourseDto>(`/admin/courses/${c.id}/copy`, { method: 'POST' }),
    );
    if (!r) return;
    toast.success(t('courseAdmin.copied'), {
      description: t('courseAdmin.copiedHint', { title: r.title }),
      action: {
        label: t('courseAdmin.open'),
        onClick: () => router.push(`/admin/kurslar/${r.slug}`),
      },
    });
    router.refresh();
  }

  async function restore(c: CourseRef) {
    const r = await run('restore', () =>
      api<AdminCourseDto>(`/admin/courses/${c.id}/restore`, { method: 'POST' }),
    );
    if (!r) return;
    toast.success(t('courseAdmin.restored'));
    done(r);
  }

  /** Dialoq təsdiqləyəndən sonra çağırılır; xətanı dialoqa qaytarır */
  async function softDelete(c: CourseRef, confirm: string) {
    const r = await api<AdminCourseDto>(
      `/admin/courses/${c.id}?confirm=${encodeURIComponent(confirm)}`,
      { method: 'DELETE' },
    );
    toast.success(t('courseAdmin.deleted'), {
      description: t('courseAdmin.deletedHint', { title: c.title, days: COURSE_TRASH_DAYS }),
      duration: 10_000,
      action: { label: t('courseAdmin.undo'), onClick: () => void restore(r) },
    });
    done(r);
  }

  async function purge(c: CourseRef, confirm: string) {
    await api(`/admin/courses/${c.id}/permanent?confirm=${encodeURIComponent(confirm)}`, {
      method: 'DELETE',
    });
    toast.success(t('courseAdmin.purged'), { description: t('courseAdmin.purgedHint') });
    done(null);
  }

  return { busy, setPublished, setArchived, copy, restore, softDelete, purge };
}

/**
 * Təhlükəsiz silmə dialoqu: tələbə / fəsil / addım sayı; tələbə yazılıbsa kursun adı dəqiq yazılmayınca
 * "Sil" deaktivdir (eyni qayda backend-də də yoxlanır). mode="purge" — "Silinənlər"-dən həmişəlik silmə.
 */
export function CourseDeleteDialog({
  course,
  mode,
  open,
  onOpenChange,
  onConfirm,
}: {
  course: CourseRef | null;
  mode: 'soft' | 'purge';
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (c: CourseRef, typed: string) => Promise<void>;
}) {
  const [stats, setStats] = useState<AdminCourseStatsDto | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !course) return;
    setTyped('');
    setError(null);
    setStats(null);
    api<AdminCourseStatsDto>(`/admin/courses/${course.id}/stats`)
      .then(setStats)
      .catch((e) => setError(errorMessage(e)));
  }, [open, course]);

  if (!course) return null;
  const needsName = (stats?.enrollments ?? 0) > 0;
  const nameOk = !needsName || typed.trim() === course.title.trim();
  const blockedByPath = mode === 'purge' && (stats?.pathItems ?? 0) > 0;

  async function go() {
    if (!course) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(course, typed.trim());
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          mode === 'purge'
            ? t('courseAdmin.purgeTitle', { title: course.title })
            : t('courseAdmin.deleteTitle', { title: course.title })
        }
        description={
          mode === 'purge'
            ? t('courseAdmin.purgeDesc')
            : t('courseAdmin.deleteDesc', { days: COURSE_TRASH_DAYS })
        }
      >
        <div className="flex flex-col gap-4" data-testid="course-delete-dialog">
          <span
            className="grid size-11 place-items-center rounded-full bg-error/15 text-error"
            aria-hidden
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="grid grid-cols-3 gap-2" aria-busy={!stats}>
            {(
              [
                ['enrollments', 'statStudents'],
                ['modules', 'statModules'],
                ['steps', 'statSteps'],
              ] as const
            ).map(([k, label]) => (
              <div
                key={k}
                className="rounded-xl bg-paper p-3 text-center"
                data-testid={`stat-${k}`}
              >
                <b className="block text-2xl leading-tight">{stats ? stats[k] : '…'}</b>
                <span className="text-xs text-muted">{t(`courseAdmin.${label}`)}</span>
              </div>
            ))}
          </div>
          {blockedByPath ? (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {t('courseAdmin.inPaths', { n: stats?.pathItems ?? 0 })}
            </p>
          ) : null}
          {needsName ? (
            <label className="fld">
              <span className="lbl">{t('courseAdmin.typeTitle')}</span>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={course.title}
                autoComplete="off"
                aria-describedby="del-hint"
              />
              <span id="del-hint" className="text-xs text-muted">
                {t('courseAdmin.typeTitleHint')}
              </span>
            </label>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              disabled={!stats || !nameOk || blockedByPath}
              loading={busy}
              onClick={go}
            >
              <Trash2 className="size-4" />
              {mode === 'purge' ? t('courseAdmin.purge') : t('courseAdmin.delete')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_CLASS: Record<CourseStatus, string> = {
  published: 'bg-ok/20 text-[#0f8a66]',
  draft: 'badge-muted',
  archived: 'bg-[color-mix(in_srgb,var(--de)_20%,transparent)] text-[#a86a0c]',
  deleted: 'bg-error/15 text-[#c93535]',
};

export function CourseStatusBadge({
  status,
  className,
}: {
  status: CourseStatus;
  className?: string;
}) {
  return (
    <span className={cn('badge', STATUS_CLASS[status], className)} data-status={status}>
      {t(`courseAdmin.status.${status}`)}
    </span>
  );
}

/** Silinənlərdə qalan gün sayı */
export function daysLeft(purgeAt: string | null): number | null {
  if (!purgeAt) return null;
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / 86_400_000));
}
