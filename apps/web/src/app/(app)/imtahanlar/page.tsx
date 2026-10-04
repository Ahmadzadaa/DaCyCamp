import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, ClipboardCheck, Lock, RotateCcw, Route, X } from 'lucide-react';
import type { ExamsDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { ProgressRing } from '@/components/app/progress-ring';

export function generateMetadata(): Metadata {
  return { title: t('hub.examsTitle') };
}

export default async function ExamsPage() {
  const d = await apiTry<ExamsDto>('/me/exams');
  if (!d) redirect('/giris?next=/imtahanlar');
  const empty = d.assessments.length === 0 && d.quizzes.length === 0;
  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <h1>{t('hub.examsTitle')}</h1>
          <p>{t('hub.examsText')}</p>
        </div>
        <HeroArt kind="exam" />
      </section>

      {empty ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t('hub.examsEmpty')}
          description={t('hub.examsEmptyHint')}
          action={
            <Link href="/yollar" className="b b-brand">
              <Route aria-hidden />
              {t('hub.pickPath')}
            </Link>
          }
        />
      ) : (
        <>
          <section aria-labelledby="as-h">
            <h2 id="as-h" className="h2 !mt-2">
              {t('hub.examsAssessments')}
            </h2>
            {d.assessments.length === 0 ? (
              <p className="box text-sm text-muted">{t('hub.examsAssessmentsEmpty')}</p>
            ) : (
              <div className="cards">
                {d.assessments.map((a) => {
                  const locked = a.state === 'locked';
                  const passed = a.status === 'PASSED' || a.state === 'completed';
                  const failed = a.status === 'FAILED';
                  return (
                    <article
                      key={a.id}
                      className={cn('kc exam', locked && 'opacity-70')}
                      style={{ ['--c' as string]: a.trackColor }}
                    >
                      <span className="kind">
                        {t('paths.itemAssessment')} · {a.pathTitle}
                      </span>
                      <h3>{locked ? a.title : <Link href={a.url}>{a.title}</Link>}</h3>
                      <div className="exam-score">
                        <ProgressRing
                          percent={a.score ?? 0}
                          size={64}
                          color={passed ? '#2BD4A4' : failed ? '#FF6B6B' : a.trackColor}
                        />
                        <div>
                          <b>{a.score != null ? `${Math.round(a.score)}%` : '—'}</b>
                          <span>
                            {a.score != null ? t('hub.bestScore') : t('hub.notTaken')}
                            {a.passScore != null
                              ? ` · ${t('hub.passScore', { n: a.passScore })}`
                              : ''}
                          </span>
                        </div>
                      </div>
                      <div className="ft">
                        <span className="dur">
                          {passed ? (
                            <span className="badge badge-ok">
                              <Check aria-hidden /> {t('hub.passed')}
                            </span>
                          ) : failed ? (
                            <span className="badge badge-err">
                              <X aria-hidden /> {t('hub.failed')}
                            </span>
                          ) : locked ? (
                            <span className="badge badge-muted">
                              <Lock aria-hidden /> {t('hub.locked')}
                            </span>
                          ) : null}
                          {a.attempts ? <span>{t('hub.attempts', { n: a.attempts })}</span> : null}
                        </span>
                        {locked ? null : passed ? (
                          <Link href={a.url} className="b b-ghost b-sm">
                            {t('hub.review')}
                          </Link>
                        ) : (
                          <Link href={a.url} className="b b-brand b-sm">
                            {a.attempts ? <RotateCcw aria-hidden /> : null}
                            {a.attempts ? t('hub.retake') : t('hub.take')}
                            {a.attempts ? null : <ArrowRight aria-hidden />}
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="qz-h">
            <h2 id="qz-h" className="h2">
              {t('hub.examsQuizzes')}
            </h2>
            {d.quizzes.length === 0 ? (
              <p className="box text-sm text-muted">{t('hub.examsQuizzesEmpty')}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl-admin">
                  <thead>
                    <tr>
                      <th>{t('stepTypeShort.QUIZ')}</th>
                      <th>{t('courseAdmin.colCourse')}</th>
                      <th>{t('hub.bestScore')}</th>
                      <th>{t('common.status')}</th>
                      <th className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {d.quizzes.map((q) => {
                      const locked = q.state === 'locked';
                      const ok = q.state === 'completed';
                      return (
                        <tr key={q.id} className={cn(locked && 'dim')}>
                          <td>
                            <span className="ttl">{q.title}</span>
                          </td>
                          <td>
                            <span className="flex items-center gap-2 text-sm">
                              <span
                                className="cdot-lg"
                                style={{ background: q.trackColor }}
                                aria-hidden
                              />
                              {q.courseTitle}
                            </span>
                          </td>
                          <td className="tabular-nums">
                            {q.score != null ? `${Math.round(q.score)}%` : '—'}
                            {q.attempts ? (
                              <span className="ml-2 text-xs text-muted">
                                {t('hub.attempts', { n: q.attempts })}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            {ok ? (
                              <span className="badge badge-ok">
                                <span className="bdot" aria-hidden />
                                {t('hub.passed')}
                              </span>
                            ) : locked ? (
                              <span className="badge badge-muted">
                                <span className="bdot" aria-hidden />
                                {t('hub.locked')}
                              </span>
                            ) : (
                              <span className="badge badge-warn">
                                <span className="bdot" aria-hidden />
                                {t('hub.statusOpen')}
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            {locked ? null : (
                              <Link
                                href={q.url}
                                className={cn('b b-xs', ok ? 'b-ghost' : 'b-brand')}
                              >
                                {ok ? t('hub.review') : t('hub.take')}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
