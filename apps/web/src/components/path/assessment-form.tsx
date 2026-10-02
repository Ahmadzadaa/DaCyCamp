'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { AssessmentResultDto, PathItemViewDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PathResultToasts } from './path-result-toasts';

type A = NonNullable<PathItemViewDto['assessment']>;

/** Mərhələ imtahanı — kurs testi ilə eyni görünüş (opt-row), cavabdan sonra düzgün/səhv və izah */
export function AssessmentForm({
  itemId,
  assessment,
  preview,
}: {
  itemId: string;
  assessment: A;
  preview: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[][]>(assessment.questions.map(() => []));
  const [result, setResult] = useState<AssessmentResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const q = preview ? '?preview=1' : '';
  const passed = assessment.status === 'PASSED' && !result;

  const toggle = (qi: number, oi: number, multiple: boolean) =>
    setAnswers((a) =>
      a.map((xs, i) =>
        i !== qi
          ? xs
          : multiple
            ? xs.includes(oi)
              ? xs.filter((x) => x !== oi)
              : [...xs, oi]
            : [oi],
      ),
    );

  async function submit() {
    if (answers.some((a) => a.length === 0)) {
      toast.error(t('paths.answerAll'));
      return;
    }
    setBusy(true);
    try {
      const r = await api<AssessmentResultDto>(`/learn/path-items/${itemId}/assessment${q}`, {
        method: 'POST',
        body: { answers },
      });
      setResult(r);
      if (r.passed)
        toast.success(`✓ ${t('paths.passed')} · ${t('paths.yourScore', { n: r.score })}`);
      else
        toast.error(
          `${t('paths.yourScore', { n: r.score })} · ${t('paths.passScore', { n: assessment.passScore })}`,
        );
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{t('paths.passScore', { n: assessment.passScore })}</span>
        {assessment.attempts ? (
          <span>· {t('paths.attempts', { n: assessment.attempts })}</span>
        ) : null}
        {assessment.bestScore != null ? (
          <span>· {t('paths.bestScore', { n: Math.round(assessment.bestScore) })}</span>
        ) : null}
        {passed ? <span className="font-semibold text-ok">· ✓ {t('paths.passed')}</span> : null}
      </div>
      {assessment.questions.map((qq, qi) => {
        const r = result?.perQuestion[qi];
        return (
          <div key={qi} className="box" data-testid="assessment-question">
            <p className="font-semibold">
              {qi + 1}. {qq.text}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {qq.options.map((opt, oi) => {
                const sel = answers[qi]!.includes(oi);
                const cls = cn(
                  'opt-row',
                  sel && 'sel',
                  r && r.correctIndices.includes(oi) && 'correct',
                  r && sel && !r.correctIndices.includes(oi) && 'wrong',
                );
                return (
                  <label key={oi} className={cls}>
                    <input
                      type={qq.type === 'multiple' ? 'checkbox' : 'radio'}
                      name={`q${qi}`}
                      checked={sel}
                      disabled={!!result}
                      onChange={() => toggle(qi, oi, qq.type === 'multiple')}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {r?.explanation ? <p className="mt-2 text-sm text-muted">💡 {r.explanation}</p> : null}
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        {!result ? (
          <Button
            type="button"
            loading={busy}
            onClick={() => void submit()}
            data-testid="assessment-submit"
          >
            {t('paths.submitAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn('font-semibold', result.passed ? 'text-ok' : 'text-error')}
              data-testid="assessment-result"
            >
              {t('paths.yourScore', { n: result.score })} ·{' '}
              {result.passed ? t('paths.passed') : t('paths.failed')}
            </span>
            {!result.passed ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setResult(null);
                  setAnswers(assessment.questions.map(() => []));
                }}
              >
                {t('paths.retry')}
              </Button>
            ) : null}
          </>
        )}
      </div>
      <PathResultToasts result={result} />
    </div>
  );
}
