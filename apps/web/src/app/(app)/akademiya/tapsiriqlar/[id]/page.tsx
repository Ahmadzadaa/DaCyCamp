import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Clock, Download } from 'lucide-react';
import type { AcademyMyAssignmentDetailDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Markdown } from '@/components/app/markdown';
import { AnswerPanel } from '@/components/academy/answer-panel';
import { AttemptAnswers } from '@/components/academy/attempt-answers';
import { GradeStatusBadge, StudentStatusBadge } from '@/components/academy/badges';
import { fmtScore, fmtZoned } from '@/components/academy/format';
import { QuestionsList } from '@/components/classroom/discussions';
import { OpenStepButton } from '@/components/academy/open-step-button';

export function generateMetadata(): Metadata {
  return { title: `${t('academy.tabs.assignments')} · ${t('academy.title')}` };
}

const fileHref = (id: string) => `/api/academy/files/${id}`;

export default async function MyAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await apiTry<AcademyMyAssignmentDetailDto>(`/academy/me/assignments/${id}`);
  if (!a) notFound();
  const progress = new Map(a.itemProgress.map((p) => [p.itemId, p]));
  const stepItems = a.items.filter((i) => i.kind === 'LEARNING_STEP');
  const unsolved = stepItems.filter((i) => !progress.get(i.id)?.evidence?.passed).length;
  const attemptsLeft = a.maxAttempts - a.attemptsUsed;
  const canWork = a.canSubmit;
  const g = a.grade;

  return (
    <div className="flex flex-col gap-6" data-testid="academy-assignment">
      <Link href="/akademiya/tapsiriqlar" className="back-link">
        <ArrowLeft aria-hidden />
        {t('academy.detail.back')}
      </Link>

      <section className="box flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm text-muted">
              {a.groupCode} · {t(`academy.type.${a.type}`)}
            </span>
            <h1 className="h2">{a.title}</h1>
          </div>
          <StudentStatusBadge status={a.status} overdue={a.overdue} />
        </div>
        <dl className="ac-kv">
          <div>
            <dt>{t('academy.f.available')}</dt>
            <dd>{fmtZoned(a.availableAt)}</dd>
          </div>
          <div>
            <dt>{a.extended ? t('academy.f.myDue') : t('academy.f.due')}</dt>
            <dd>
              {fmtZoned(a.effectiveDueAt)}
              {a.extended ? (
                <span className="badge badge-mint ml-2">{t('academy.f.extended')}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>{t('academy.f.attempts')}</dt>
            <dd>{t('academy.f.attemptsOf', { used: a.attemptsUsed, max: a.maxAttempts })}</dd>
          </div>
          <div>
            <dt>{t('academy.f.maxScore')}</dt>
            <dd>{fmtScore(a.maxScore)}</dd>
          </div>
          <div>
            <dt>{t('academy.f.latePolicy')}</dt>
            <dd>
              {t(`academy.latePolicy.${a.latePolicy}`)}
              {a.latePolicy === 'ACCEPT_WITH_PENALTY' ? ` (−${a.latePenaltyPercent}%)` : ''}
            </dd>
          </div>
          {a.lateCutoffAt ? (
            <div>
              <dt>{t('academy.f.cutoff')}</dt>
              <dd>{fmtZoned(a.lateCutoffAt)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" aria-hidden />
          {t('academy.detail.serverTime')}
        </p>
        {a.description ? <Markdown content={a.description} /> : null}
        {a.deliverables.length ? (
          <div>
            <h2 className="box-h">{t('academy.f.deliverables')}</h2>
            <ul className="list-disc pl-5 text-sm">
              {a.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {a.resources.length ? (
          <div>
            <h2 className="box-h">{t('academy.f.resources')}</h2>
            <div className="ac-files">
              {a.resources.map((f) => (
                <a key={f.id} href={fileHref(f.id)} className="ac-file" download>
                  <Download className="size-4 shrink-0" aria-hidden />
                  <span>{f.filename}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {g ? (
        <section className="box flex flex-col gap-3" data-testid="academy-grade">
          <div className="flex items-center justify-between gap-3">
            <h2 className="box-h !mb-0">{t('academy.detail.grade')}</h2>
            <GradeStatusBadge status={g.status} />
          </div>
          {g.status === 'RELEASED' ? (
            <>
              <dl className="ac-kv">
                <div>
                  <dt>{t('academy.detail.raw')}</dt>
                  <dd>{fmtScore(g.rawScore)}</dd>
                </div>
                {g.latePenalty ? (
                  <div>
                    <dt>{t('academy.detail.penalty')}</dt>
                    <dd>−{fmtScore(g.latePenalty)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t('academy.detail.final')}</dt>
                  <dd className="text-xl">
                    {fmtScore(g.finalScore)} / {fmtScore(g.maxScore)}
                  </dd>
                </div>
              </dl>
              {g.itemScores.length ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {g.itemScores.map((s) => {
                    const item = a.items.find((i) => i.id === s.itemId);
                    return (
                      <li key={s.itemId} className="flex justify-between gap-3">
                        <span>
                          {item?.title}
                          {s.comment ? <span className="text-muted"> — {s.comment}</span> : null}
                        </span>
                        <b>
                          {fmtScore(s.score)} / {fmtScore(item?.maxScore)}
                        </b>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-semibold">{t('academy.detail.returned')}</p>
          )}
          {g.feedback ? (
            <div className="rounded-xl bg-paper p-4 text-sm">
              <b className="mb-1 block">{t('academy.f.feedback')}</b>
              <Markdown content={g.feedback} />
            </div>
          ) : null}
        </section>
      ) : null}

      {a.items.length ? (
        <section className="box flex flex-col gap-4">
          <h2 className="box-h !mb-0">{t('academy.f.items')}</h2>
          {stepItems.map((i) => {
            const p = progress.get(i.id);
            const passed = !!p?.evidence?.passed;
            return (
              <div key={i.id} className="ac-item" data-testid="academy-step-item">
                <div className="ac-item-h">
                  <span className="flex items-center gap-2">
                    {passed ? (
                      <CheckCircle2
                        className="size-5 text-ok-ink"
                        aria-label={t('academy.detail.solved')}
                      />
                    ) : (
                      <Circle
                        className="size-5 text-muted"
                        aria-label={t('academy.detail.notSolved')}
                      />
                    )}
                    <b>{i.step?.title ?? i.title}</b>
                  </span>
                  <span className="text-sm text-muted">
                    {i.step ? `${i.step.courseTitle} · ` : ''}
                    {fmtScore(i.maxScore)} {t('academy.f.score').toLowerCase()}
                  </span>
                </div>
                <span className="ac-meta">
                  <span>{passed ? t('academy.detail.solved') : t('academy.detail.notSolved')}</span>
                  {p?.evidence ? <span>{t(`academy.trust.${p.evidence.trust}`)}</span> : null}
                </span>
                {p?.openUrl && canWork ? (
                  <OpenStepButton assignmentId={a.id} itemId={i.id} />
                ) : null}
              </div>
            );
          })}
          {canWork ? (
            <AnswerPanel
              assignmentId={a.id}
              items={a.items}
              draft={a.draft?.answers ?? null}
              stagedFiles={a.stagedFiles}
              attemptsLeft={attemptsLeft}
              unsolvedSteps={unsolved}
            />
          ) : (
            <p className="rounded-xl bg-paper p-4 text-sm" data-testid="academy-closed-note">
              {a.status === 'NOT_OPEN'
                ? t('academy.detail.notOpen', { date: fmtZoned(a.availableAt) })
                : a.status === 'UNDER_REVIEW' ||
                    a.status === 'SUBMITTED' ||
                    a.status === 'SUBMITTED_LATE'
                  ? attemptsLeft <= 0
                    ? t('academy.detail.limit')
                    : t('academy.detail.underReview')
                  : t('academy.detail.closed')}
            </p>
          )}
        </section>
      ) : null}

      {a.attempts.length ? (
        <section className="box flex flex-col gap-3" data-testid="academy-attempts">
          <h2 className="box-h !mb-0">{t('academy.detail.myAttempts')}</h2>
          {[...a.attempts].reverse().map((at) => (
            <details key={at.id} className="ac-item">
              <summary className="ac-item-h cursor-pointer">
                <b>{t('academy.detail.attempt', { n: at.attemptNumber })}</b>
                <span className="ac-meta">
                  <span>{fmtZoned(at.submittedAt)}</span>
                  {at.isLate ? (
                    <span className="badge badge-warn">{t('academy.detail.late')}</span>
                  ) : null}
                  {at.autoScore !== null ? (
                    <span>{t('academy.detail.autoScore', { n: fmtScore(at.autoScore) })}</span>
                  ) : null}
                </span>
              </summary>
              <AttemptAnswers attempt={at} items={a.items} />
            </details>
          ))}
        </section>
      ) : null}
      <QuestionsList groupId={a.groupId} assignmentId={a.id} readOnly={a.status === 'NOT_OPEN'} />
    </div>
  );
}
