'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import type { AcademySubmissionDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GradeStatusBadge, StudentStatusBadge } from '../badges';
import { fmtScore, fmtZoned } from '../format';

/** Göndərişlər: bütün tələbələr (göndərməyənlər də); «yoxlanılmalı» filtri; hazır qiymətləri toplu açıqlamaq */
export function SubmissionsTable({
  assignmentId,
  rows,
  canRelease,
  timezone,
}: {
  assignmentId: string;
  rows: AcademySubmissionDto[];
  canRelease: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<'review' | 'all'>(
    rows.some((r) => r.needsReview) ? 'review' : 'all',
  );
  const [busy, setBusy] = useState(false);
  const shown = rows.filter((r) => filter === 'all' || r.needsReview);
  const releasable = rows.some((r) => r.grade?.status === 'DRAFT');

  async function releaseAll() {
    setBusy(true);
    try {
      const r = await api<{ released: number; skipped: Array<{ reason: string }> }>(
        `/academy/assignments/${assignmentId}/grades/release`,
        { method: 'POST' },
      );
      toast.success(t('academy.teacher.releasedN', { n: r.released }));
      // brauzerdə yoxlanılan Python ballı qaralamalar toplu açıqlanmır (SEC-04)
      const review = r.skipped.filter((x) => x.reason === 'ACADEMY_GRADE_NEEDS_REVIEW').length;
      if (review) toast.warning(t('academy.teacher.needsCodeReview', { n: review }));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn('chip', filter === 'review' && 'on')}
          onClick={() => setFilter('review')}
        >
          {t('academy.teacher.needsReview')}{' '}
          <span className="chip-n">{rows.filter((r) => r.needsReview).length}</span>
        </button>
        <button
          type="button"
          className={cn('chip', filter === 'all' && 'on')}
          onClick={() => setFilter('all')}
        >
          {t('academy.teacher.all')} <span className="chip-n">{rows.length}</span>
        </button>
        {canRelease && releasable ? (
          <Button
            size="sm"
            variant="navy"
            className="ml-auto"
            onClick={releaseAll}
            loading={busy}
            data-testid="release-all"
          >
            <Send className="size-4" />
            {t('academy.teacher.releaseAll')}
          </Button>
        ) : null}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t('academy.empty.submissions')}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl-admin" data-testid="submissions-table">
            <thead>
              <tr>
                <th>{t('academy.f.student')}</th>
                <th>{t('academy.f.status')}</th>
                <th>{t('academy.f.submitted')}</th>
                <th>{t('academy.f.attempts')}</th>
                <th>{t('academy.f.score')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.student.id}>
                  <td>
                    <span className="ttl">{r.student.name}</span>
                    {r.extended ? (
                      <div className="slug">
                        {t('academy.f.extended')}: {fmtZoned(r.effectiveDueAt, { tz: timezone })}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <StudentStatusBadge status={r.status} />
                  </td>
                  <td>
                    {r.latestSubmittedAt ? fmtZoned(r.latestSubmittedAt, { tz: timezone }) : '—'}
                  </td>
                  <td>{r.attemptCount}</td>
                  <td>
                    {r.grade ? (
                      <span className="inline-flex items-center gap-2">
                        {r.grade.status !== 'RETURNED'
                          ? `${fmtScore(r.grade.finalScore)} / ${fmtScore(r.grade.maxScore)}`
                          : ''}
                        <GradeStatusBadge status={r.grade.status} />
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {r.id && r.attemptCount > 0 ? (
                      <Link
                        href={`/muellim/gonderisler/${r.id}`}
                        className={cn('b b-xs', r.needsReview ? 'b-brand' : 'b-ghost')}
                      >
                        {t('academy.teacher.grade')}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
