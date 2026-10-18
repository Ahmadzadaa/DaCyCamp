'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RotateCcw, Save, Send } from 'lucide-react';
import type { AcademySubmissionDetailDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { fmtScore } from '../format';

/**
 * Qiymət formu. Rubrika varsa — meyar balları, yoxdursa — element balları (platforma tapşırıqları seçilmiş cəhdin
 * server balı ilə doldurulur, dəyişdirilə bilər). Saxlamaq — qaralama; açıqlamaq və qaytarmaq — aparıcı / admin.
 */
export function GradeForm({ d }: { d: AcademySubmissionDetailDto }) {
  const router = useRouter();
  const a = d.assignment;
  const g = d.grade;
  const can = (x: string) => d.permissions.includes(x as never);
  const latest = d.attempts[d.attempts.length - 1];
  const [selected, setSelected] = useState(g?.selectedAttemptId ?? latest?.id ?? '');
  const attempt = d.attempts.find((x) => x.id === selected) ?? latest;
  const autoOf = (itemId: string) =>
    attempt?.answers.find((x) => x.itemId === itemId)?.evaluation?.score ?? null;
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      a.items.map((i) => {
        const s =
          g?.itemScores.find((x) => x.itemId === i.id)?.score ??
          (i.kind === 'LEARNING_STEP' ? autoOf(i.id) : null);
        return [i.id, s === null || s === undefined ? '' : String(s)];
      }),
    ),
  );
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries((g?.itemScores ?? []).map((x) => [x.itemId, x.comment ?? ''])),
  );
  const [rubric, setRubric] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (a.rubric?.criteria ?? []).map((c) => [
        c.id,
        String(g?.rubricScores.find((x) => x.criterionId === c.id)?.score ?? ''),
      ]),
    ),
  );
  const [feedback, setFeedback] = useState(g?.feedback ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const released = g?.status === 'RELEASED';
  const total = useMemo(() => {
    const vals = a.rubric ? Object.values(rubric) : Object.values(scores);
    return Math.round(vals.reduce((s, v) => s + (Number(v) || 0), 0) * 100) / 100;
  }, [a.rubric, rubric, scores]);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run(
      'save',
      () =>
        api(`/academy/submissions/${d.id}/grade`, {
          method: 'PUT',
          body: {
            ...(a.rubric
              ? {
                  rubricScores: a.rubric.criteria.map((c) => ({
                    criterionId: c.id,
                    score: Number(rubric[c.id] || 0),
                  })),
                }
              : {
                  itemScores: a.items
                    .filter((i) => scores[i.id] !== '')
                    .map((i) => ({
                      itemId: i.id,
                      score: Number(scores[i.id]),
                      ...(comments[i.id] ? { comment: comments[i.id] } : {}),
                    })),
                }),
            feedback,
            ...(a.attemptSelection === 'INSTRUCTOR_SELECTED'
              ? { selectedAttemptId: selected }
              : {}),
            ...(released ? { reason } : {}),
            expectedVersion: g?.version ?? 0,
          },
        }),
      t('academy.gradeForm.saved'),
    );

  return (
    <div className="flex flex-col gap-4" data-testid="grade-form">
      {g?.stale ? (
        <p className="rounded-xl bg-paper p-3 text-sm font-semibold text-error-ink" role="status">
          {t('academy.gradeForm.stale')}
        </p>
      ) : null}
      {a.attemptSelection === 'INSTRUCTOR_SELECTED' && d.attempts.length > 1 ? (
        <Field label={t('academy.gradeForm.selectAttempt')}>
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {d.attempts.map((x) => (
              <option key={x.id} value={x.id}>
                {t('academy.detail.attempt', { n: x.attemptNumber })}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {a.rubric
        ? a.rubric.criteria.map((c) => (
            <Field
              key={c.id}
              label={`${c.title} (${t('academy.f.maxScore').toLowerCase()} ${fmtScore(c.maxScore)})`}
            >
              <Input
                type="number"
                min={0}
                max={c.maxScore}
                step={0.01}
                value={rubric[c.id] ?? ''}
                onChange={(e) => setRubric((r) => ({ ...r, [c.id]: e.target.value }))}
                data-testid="rubric-score"
              />
            </Field>
          ))
        : a.items.map((i) => {
            const auto = i.kind === 'LEARNING_STEP' ? autoOf(i.id) : null;
            return (
              <div key={i.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
                <Field
                  label={`${i.step?.title ?? i.title} (${fmtScore(i.maxScore)})`}
                  hint={
                    auto !== null ? t('academy.gradeForm.auto', { n: fmtScore(auto) }) : undefined
                  }
                >
                  <Input
                    value={comments[i.id] ?? ''}
                    onChange={(e) => setComments((c) => ({ ...c, [i.id]: e.target.value }))}
                    placeholder={t('academy.gradeForm.comment')}
                    maxLength={2000}
                  />
                </Field>
                <Field label={t('academy.f.score')}>
                  <Input
                    type="number"
                    min={0}
                    max={i.maxScore}
                    step={0.01}
                    value={scores[i.id] ?? ''}
                    onChange={(e) => setScores((s) => ({ ...s, [i.id]: e.target.value }))}
                    data-testid="item-score"
                  />
                </Field>
              </div>
            );
          })}
      <p className="text-sm font-semibold">
        {t('academy.detail.raw')}: {fmtScore(total)} / {fmtScore(a.maxScore)}
      </p>
      <Field label={t('academy.f.feedback')}>
        <Textarea
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={20_000}
          data-testid="grade-feedback"
        />
      </Field>
      {released ? (
        <Field label={t('academy.f.reason')}>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('academy.gradeForm.reasonPh')}
            maxLength={500}
          />
        </Field>
      ) : null}
      {error ? (
        <p className="text-sm text-error-ink" role="alert" data-testid="grade-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {can('grade.write') && (!released || can('grade.release')) ? (
          <Button
            onClick={save}
            loading={busy === 'save'}
            disabled={busy !== null}
            data-testid="grade-save"
          >
            <Save className="size-4" />
            {released ? t('academy.form.saveChanges') : t('academy.gradeForm.save')}
          </Button>
        ) : null}
        {can('grade.release') && g?.status === 'DRAFT' ? (
          <Button
            variant="navy"
            loading={busy === 'release'}
            disabled={busy !== null || !!g.stale}
            onClick={() =>
              run(
                'release',
                () =>
                  api(`/academy/submissions/${d.id}/grade/release`, {
                    method: 'POST',
                    body: { expectedVersion: g.version },
                  }),
                t('academy.gradeForm.released'),
              )
            }
            data-testid="grade-release"
          >
            <Send className="size-4" />
            {t('academy.gradeForm.release')}
          </Button>
        ) : null}
        {can('grade.release') && (!g || g.status === 'DRAFT') ? (
          <Button
            variant="ghost"
            loading={busy === 'return'}
            disabled={busy !== null || !feedback.trim()}
            title={!feedback.trim() ? t('academy.gradeForm.returnPh') : undefined}
            onClick={() =>
              run(
                'return',
                () =>
                  api(`/academy/submissions/${d.id}/grade/return`, {
                    method: 'POST',
                    body: { feedback, expectedVersion: g?.version ?? 0 },
                  }),
                t('academy.gradeForm.returnedOk'),
              )
            }
          >
            <RotateCcw className="size-4" />
            {t('academy.gradeForm.return')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
