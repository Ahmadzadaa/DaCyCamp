'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Archive, Check, Copy, Trash2 } from 'lucide-react';
import { COURSE_TRASH_DAYS, type AdminCourseDto, type CourseStatus } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

type CourseRef = Pick<AdminCourseDto, 'id' | 'slug' | 'title' | 'isPublished' | 'status'>;

/**
 * Kurs səviyyəsində əməliyyatlar (dərc, arxiv, surət, silmə, bərpa, həmişəlik silmə) — toast + "Geri qaytar".
 * `onChange` yenilənmiş kursu alır; verilməzsə səhifə serverdən yenilənir.
 */
export function useCourseActions(onChange?: (c: AdminCourseDto | null) => void) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  /** `next` verilibsə ora keçir, yoxsa səhifəni yeniləyir — refresh + push ardıcıl çağırılanda
   *  gedən refresh keçidi «udurdu» (silinmiş kursun səhifəsində qalırdıq) */
  const done = (c: AdminCourseDto | null, next?: string) => {
    if (onChange) onChange(c);
    if (next) router.push(next);
    else router.refresh();
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
        icon: <Archive />,
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
      icon: <Copy />,
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
  async function softDelete(c: CourseRef, confirm: string, next?: string) {
    const r = await api<AdminCourseDto>(
      `/admin/courses/${c.id}?confirm=${encodeURIComponent(confirm)}`,
      { method: 'DELETE' },
    );
    toast.success(t('courseAdmin.deleted'), {
      icon: <Check />,
      description: t('courseAdmin.deletedHint', { title: c.title, days: COURSE_TRASH_DAYS }),
      duration: 10_000,
      action: { label: t('courseAdmin.undo'), onClick: () => void restore(r) },
    });
    done(r, next);
  }

  async function purge(c: CourseRef, confirm: string, next?: string) {
    await api(`/admin/courses/${c.id}/permanent?confirm=${encodeURIComponent(confirm)}`, {
      method: 'DELETE',
    });
    toast.success(t('courseAdmin.purged'), {
      icon: <AlertTriangle />,
      className: 'toast-danger',
      description: t('courseAdmin.purgedHint'),
    });
    done(null, next);
  }

  return { busy, setPublished, setArchived, copy, restore, softDelete, purge };
}

/**
 * Sadə silmə təsdiqi: «Kursu silməyə razısınız?» → Xeyr / Bəli, sil. mode="purge" — "Silinənlər"-dən
 * həmişəlik silmə. Backend tələbəli kurs üçün `confirm` = kursun adı istəyir (skriptlə təsadüfi silmənin
 * qarşısını alır) — dialoq təsdiqlənəndə adı özü göndərir.
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
  onConfirm: (c: CourseRef, confirm: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!course) return null;

  async function go() {
    if (!course) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(course, course.title.trim());
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
        icon={<AlertTriangle />}
        tone="danger"
        className="max-w-[440px]"
        title={mode === 'purge' ? t('courseAdmin.purgeTitle') : t('courseAdmin.deleteTitle')}
        description={
          mode === 'purge'
            ? t('courseAdmin.purgeDesc', { title: course.title })
            : t('courseAdmin.deleteDesc', { title: course.title, days: COURSE_TRASH_DAYS })
        }
      >
        <div className="flex flex-col gap-4" data-testid="course-delete-dialog">
          {error ? (
            <div role="alert" className="dlg-alert">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.no')}
              </Button>
            </DialogClose>
            <Button type="button" variant="dangerSolid" loading={busy} onClick={go}>
              <Trash2 className="size-4" />
              {mode === 'purge' ? t('courseAdmin.yesPurge') : t('courseAdmin.yesDelete')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_CLASS: Record<CourseStatus, string> = {
  published: 'badge-ok',
  draft: 'badge-muted',
  archived: 'badge-warn',
  deleted: 'badge-err',
};

/** Status nişanı nöqtə ilə: • Dərc olunub / • Qaralama / • Arxivdə / • Silinib */
export function CourseStatusBadge({
  status,
  className,
}: {
  status: CourseStatus;
  className?: string;
}) {
  return (
    <span className={cn('badge', STATUS_CLASS[status], className)} data-status={status}>
      <span className="bdot" aria-hidden />
      {t(`courseAdmin.status.${status}`)}
    </span>
  );
}

/** Silinənlərdə qalan gün sayı */
export function daysLeft(purgeAt: string | null): number | null {
  if (!purgeAt) return null;
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / 86_400_000));
}
