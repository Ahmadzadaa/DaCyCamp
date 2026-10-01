'use client';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Seg } from '../seg';

export interface QuizQuestionValue {
  text: string;
  type: 'single' | 'multiple';
  options: string[];
  correct: number[];
  explanation?: string;
}
export interface QuizValues {
  pass_score: number;
  shuffle_questions: boolean;
  questions: QuizQuestionValue[];
}

const emptyQuestion = (): QuizQuestionValue => ({
  text: '',
  type: 'single',
  options: ['', ''],
  correct: [],
  explanation: '',
});

export function QuizForm({
  values,
  onChange,
}: {
  values: QuizValues;
  onChange: (v: QuizValues) => void;
}) {
  const setQ = (i: number, patch: Partial<QuizQuestionValue>) =>
    onChange({
      ...values,
      questions: values.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)),
    });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= values.questions.length) return;
    const qs = [...values.questions];
    [qs[i], qs[j]] = [qs[j]!, qs[i]!];
    onChange({ ...values, questions: qs });
  };
  return (
    <>
      <Field label={t('admin.passScore')}>
        <Input
          type="number"
          min={0}
          max={100}
          value={values.pass_score}
          onChange={(e) => onChange({ ...values, pass_score: Number(e.target.value) })}
        />
      </Field>
      <Field label={t('admin.shuffle')}>
        <label className="flex items-center gap-3 py-1 text-sm font-normal">
          <Switch
            checked={values.shuffle_questions}
            onCheckedChange={(v) => onChange({ ...values, shuffle_questions: v })}
          />
          <span>{values.shuffle_questions ? t('common.yes') : t('common.no')}</span>
        </label>
      </Field>
      <div className="flex flex-col gap-3 md:col-span-2">
        <span className="text-sm font-semibold">
          {t('admin.questions')} ({values.questions.length})
        </span>
        {values.questions.length === 0 ? (
          <p className="text-sm text-muted">{t('admin.questionsEmpty')}</p>
        ) : null}
        {values.questions.map((q, i) => (
          <div key={i} className="box flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm">
                {t('admin.question')} {i + 1}
              </b>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="↑"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(i, 1)}
                  disabled={i === values.questions.length - 1}
                  aria-label="↓"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    onChange({ ...values, questions: values.questions.filter((_, k) => k !== i) })
                  }
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <Field label={t('admin.question')}>
              <Textarea
                value={q.text}
                onChange={(e) => setQ(i, { text: e.target.value })}
                rows={2}
              />
            </Field>
            <Field label={t('admin.stepType')}>
              <Seg
                value={q.type}
                onChange={(type) =>
                  setQ(i, { type, correct: type === 'single' ? q.correct.slice(0, 1) : q.correct })
                }
                options={[
                  { value: 'single', label: t('admin.single') },
                  { value: 'multiple', label: t('admin.multiple') },
                ]}
                label={t('admin.stepType')}
              />
            </Field>
            <div className="fld">
              <span className="lbl">
                {t('admin.options')}{' '}
                <span className="font-normal text-muted">
                  — {t('admin.correct')}: {q.type === 'single' ? '◉' : '☑'}
                </span>
              </span>
              {q.options.map((opt, oi) => {
                const checked = q.correct.includes(oi);
                return (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type={q.type === 'single' ? 'radio' : 'checkbox'}
                      name={`q${i}-correct`}
                      checked={checked}
                      aria-label={`${t('admin.correct')} ${oi + 1}`}
                      className="accent-[var(--brand)]"
                      onChange={() =>
                        setQ(i, {
                          correct:
                            q.type === 'single'
                              ? [oi]
                              : checked
                                ? q.correct.filter((x) => x !== oi)
                                : [...q.correct, oi].sort((a, b) => a - b),
                        })
                      }
                    />
                    <Input
                      value={opt}
                      onChange={(e) =>
                        setQ(i, {
                          options: q.options.map((o, k) => (k === oi ? e.target.value : o)),
                        })
                      }
                      placeholder={`${t('admin.options')} ${oi + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t('common.delete')}
                      disabled={q.options.length <= 2}
                      onClick={() =>
                        setQ(i, {
                          options: q.options.filter((_, k) => k !== oi),
                          correct: q.correct
                            .filter((x) => x !== oi)
                            .map((x) => (x > oi ? x - 1 : x)),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQ(i, { options: [...q.options, ''] })}
                  disabled={q.options.length >= 12}
                >
                  <Plus className="size-4" />
                  {t('admin.addOption')}
                </Button>
              </div>
            </div>
            <Field label={t('admin.explanation')}>
              <Textarea
                value={q.explanation ?? ''}
                onChange={(e) => setQ(i, { explanation: e.target.value })}
                rows={2}
              />
            </Field>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="dark"
            onClick={() =>
              onChange({ ...values, questions: [...values.questions, emptyQuestion()] })
            }
          >
            <Plus className="size-4" />
            {t('admin.addQuestion')}
          </Button>
        </div>
      </div>
    </>
  );
}
