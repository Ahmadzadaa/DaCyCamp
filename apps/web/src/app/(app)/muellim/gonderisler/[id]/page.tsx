import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { AcademySubmissionDetailDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { AttemptAnswers } from '@/components/academy/attempt-answers';
import { GradeStatusBadge } from '@/components/academy/badges';
import { fmtScore, fmtZoned } from '@/components/academy/format';
import { GradeForm } from '@/components/academy/teacher/grade-form';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.teacher.grade')} · ${t('academy.teacherTitle')}` };
}

export default async function GradeSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await apiTry<AcademySubmissionDetailDto>(`/academy/submissions/${id}`);
  if (!d) notFound();
  const a = d.assignment;
  return (
    <>
      <Link href={`/muellim/tapsiriqlar/${a.id}`} className="back-link">
        <ArrowLeft aria-hidden />
        {a.title}
      </Link>
      <div className="ph1 !mb-0">
        <div className="min-w-0">
          <h1>{d.student.name}</h1>
          <p className="flex flex-wrap items-center gap-2">
            <span>
              {a.groupCode} · {a.title}
            </span>
            <span>
              · {t('academy.f.due')}: {fmtZoned(d.effectiveDueAt)}
            </span>
            {d.grade ? <GradeStatusBadge status={d.grade.status} /> : null}
          </p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="box flex min-w-0 flex-col gap-3" aria-labelledby="g-att">
          <h2 id="g-att" className="box-h !mb-0">
            {t('academy.f.attempts')}
          </h2>
          {[...d.attempts].reverse().map((at, idx) => (
            <details key={at.id} className="ac-item" open={idx === 0}>
              <summary className="ac-item-h cursor-pointer">
                <b>{t('academy.detail.attempt', { n: at.attemptNumber })}</b>
                <span className="ac-meta">
                  <span>{fmtZoned(at.submittedAt)}</span>
                  <span>{t('academy.teacher.version', { n: at.assignmentVersion })}</span>
                  {at.isLate ? (
                    <span className="badge badge-warn">{t('academy.detail.late')}</span>
                  ) : null}
                  {at.autoScore !== null ? (
                    <span>{t('academy.detail.autoScore', { n: fmtScore(at.autoScore) })}</span>
                  ) : null}
                  {d.grade?.selectedAttemptId === at.id ? (
                    <span className="badge badge-mint">✓</span>
                  ) : null}
                </span>
              </summary>
              <AttemptAnswers attempt={at} items={a.items} />
            </details>
          ))}
        </section>
        <div className="flex min-w-0 flex-col gap-6">
          <section className="box" aria-labelledby="g-form">
            <h2 id="g-form" className="box-h">
              {t('academy.detail.grade')}
            </h2>
            <GradeForm d={d} />
          </section>
          {d.history.length ? (
            <section className="box" aria-labelledby="g-hist">
              <h2 id="g-hist" className="box-h">
                {t('academy.gradeForm.history')}
              </h2>
              <ul className="flex flex-col gap-2 text-sm" data-testid="grade-history">
                {d.history.map((h, i) => (
                  <li key={i} className="flex flex-col">
                    <span>
                      <b>{t(`academy.gradeStatus.${h.newStatus}`)}</b>
                      {h.newScore !== null
                        ? ` · ${fmtScore(h.previousScore)} → ${fmtScore(h.newScore)}`
                        : ''}
                    </span>
                    <span className="text-muted">
                      {t('academy.gradeForm.changeBy', {
                        who: h.changedBy?.name ?? '—',
                        when: fmtZoned(h.changedAt),
                      })}
                    </span>
                    {h.reason ? <span className="text-muted">{h.reason}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
