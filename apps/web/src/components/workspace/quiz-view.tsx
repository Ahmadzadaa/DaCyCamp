'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { QuizResultDto, QuizStudentView, StepViewDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/app/markdown';
import { useAfterComplete } from './use-complete';

export function QuizView({ view, quiz }: { view: StepViewDto; quiz: QuizStudentView }) {
  const after = useAfterComplete(view.course.slug);
  const [answers, setAnswers] = useState<number[][]>(() => quiz.questions.map(() => []));
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const q = view.preview ? '?preview=1' : '';
  const wasCompleted = view.state === 'completed';
  const nextHref = view.next
    ? `/kurs/${view.course.slug}/${view.next.moduleKey}/${view.next.stepKey}${view.preview ? '?onizle=1' : ''}`
    : `/kurs/${view.course.slug}`;

  function toggle(qi: number, oi: number, multiple: boolean) {
    if (result) return;
    setAnswers((prev) => {
      const next = prev.map((a) => [...a]);
      if (multiple)
        next[qi] = next[qi]!.includes(oi) ? next[qi]!.filter((x) => x !== oi) : [...next[qi]!, oi];
      else next[qi] = [oi];
      return next;
    });
  }
  const allAnswered = answers.every((a) => a.length > 0);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<QuizResultDto>(`/learn/steps/${view.id}/submit${q}`, {
        method: 'POST',
        body: { kind: 'quiz', answers },
      });
      setResult(r);
      if (r.passed)
        toast(`🎉 ${t('ws.quizPassed')}`, {
          description:
            r.xpAwarded > 0
              ? t('ws.earned', { n: r.xpAwarded })
              : t('ws.quizResult', { score: r.score, pass: quiz.pass_score }),
        });
      else
        toast.error(t('ws.quizFailed'), {
          description: t('ws.quizResult', { score: r.score, pass: quiz.pass_score }),
        });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ws-scroll">
      <div className="ws-center">
        <div className="kicker mb-3 flex flex-wrap items-center gap-2">
          <span
            className="badge badge-track"
            style={{ ['--c' as string]: view.course.track.color }}
          >
            {t('stepType.QUIZ')} · {view.position.index} / {view.position.total}
          </span>
          <span className="xp">{t('common.plusXp', { n: view.xp })}</span>
          <span className="text-xs text-on-dark-muted">
            {t('ws.passScore', { n: quiz.pass_score })}
          </span>
          {view.attempts > 0 ? (
            <span className="text-xs text-on-dark-muted">
              {t('ws.attempts', { n: view.attempts })}
            </span>
          ) : null}
        </div>
        <h1 className="mb-5 text-[1.6rem]">{view.title}</h1>

        {quiz.questions.map((question, qi) => {
          const r = result?.perQuestion[qi];
          const multiple = question.type === 'multiple';
          return (
            <fieldset key={qi} className={cn('quiz-q', r && (r.correct ? 'good' : 'bad'))}>
              <legend className="sr-only">{question.text}</legend>
              <div className="quiz-q-text">
                <span>{qi + 1}.</span>
                <Markdown content={question.text} assetMap={view.assets} dark />
              </div>
              <p className="text-xs text-on-dark-muted">
                {multiple ? t('ws.selectMany') : t('ws.selectOne')}
              </p>
              {question.options.map((opt, oi) => {
                const sel = answers[qi]!.includes(oi);
                const isCorrect = r?.correctIndices.includes(oi);
                return (
                  <label
                    key={oi}
                    className={cn(
                      'opt-row',
                      sel && 'sel',
                      r && isCorrect && 'correct',
                      r && sel && !isCorrect && 'wrong',
                    )}
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`q${qi}`}
                      checked={sel}
                      onChange={() => toggle(qi, oi, multiple)}
                      disabled={!!result}
                      className="accent-[var(--brand)]"
                    />
                    <span>{opt}</span>
                    {r && isCorrect ? (
                      <span className="ml-auto text-xs font-semibold text-ok">✓</span>
                    ) : null}
                  </label>
                );
              })}
              {r ? (
                <div className="mt-3 text-sm">
                  <span
                    className={r.correct ? 'font-semibold text-ok' : 'font-semibold text-error'}
                  >
                    {r.correct ? `✓ ${t('ws.correct')}` : `✗ ${t('ws.wrong')}`}
                  </span>
                  {r.explanation ? (
                    <p className="mt-1 text-on-dark-muted">
                      <b className="text-on-dark">{t('ws.explanation')}:</b> {r.explanation}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
          );
        })}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-navy-line pt-5">
          {result ? (
            <>
              <span
                className={cn('text-sm font-semibold', result.passed ? 'text-ok' : 'text-error')}
              >
                {t('ws.quizResult', { score: result.score, pass: quiz.pass_score })}
              </span>
              <span className="flex-1" />
              {!result.passed ? (
                <Button
                  variant="run"
                  onClick={() => {
                    setResult(null);
                    setAnswers(quiz.questions.map(() => []));
                  }}
                >
                  {t('ws.tryAgain')}
                </Button>
              ) : null}
              {result.passed || wasCompleted ? (
                <Button onClick={() => after(result, view.preview)}>
                  {view.next ? `${t('common.continue')} →` : t('ws.backToCourse')}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {wasCompleted && !view.preview ? (
                <>
                  <span className="text-sm font-semibold text-ok">✓ {t('common.completed')}</span>
                  <Link href={nextHref} className="b b-ghost border-navy-line text-on-dark">
                    {view.next ? t('ws.nextStep') : t('ws.backToCourse')} →
                  </Link>
                </>
              ) : null}
              <span className="flex-1" />
              <Button onClick={submit} loading={busy} disabled={!allAnswered}>
                {t('ws.submitAnswers')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
