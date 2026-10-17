'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  ACADEMY_ASSIGNMENT_TYPES,
  ACADEMY_ATTEMPT_SELECTIONS,
  ACADEMY_GRADING_TYPES,
  ACADEMY_ITEM_KINDS,
  ACADEMY_LATE_POLICIES,
  type AcademyAssignmentDto,
  type AcademyItemKind,
  type AcademyStepRefDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { fmtScore, fromLocalInput, toLocalInput } from '../format';

interface ItemDraft {
  key: string;
  id?: string;
  kind: AcademyItemKind;
  stepId?: string;
  step?: AcademyStepRefDto | null;
  title: string;
  description: string;
  maxScore: number;
}

let seq = 0;
const k = () => `i${++seq}`;

/** Addım axtarışı (yalnız dərc olunmuş platforma tapşırıqları) */
function StepPicker({ onPick }: { onPick: (s: AcademyStepRefDto) => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AcademyStepRefDto[] | null>(null);
  useEffect(() => {
    const h = setTimeout(() => {
      api<AcademyStepRefDto[]>(
        `/academy/steps/search?limit=12${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`,
      )
        .then(setRows)
        .catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(h);
  }, [q]);
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('academy.form.stepSearchPh')}
          aria-label={t('academy.form.searchStep')}
          className="pl-9"
          data-testid="step-search"
        />
      </div>
      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted">{t('academy.form.noSteps')}</p>
      ) : null}
      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
        {(rows ?? []).map((s) => (
          <li key={s.stepId}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-soft"
              onClick={() => onPick(s)}
            >
              <span className="min-w-0">
                <b className="block truncate">{s.title}</b>
                <span className="block truncate text-xs text-muted">
                  {s.courseTitle} · {s.moduleTitle}
                </span>
              </span>
              <span className="badge badge-muted shrink-0">{s.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Tapşırıq formu (yaratma / redaktə). Redaktədə yalnız dəyişən sahələr göndərilir (son tarix dəyişikliyi
 * aparıcı müəllimin hüququdur), versiya toqquşması üçün expectedVersion əlavə olunur.
 */
export function AssignmentForm({
  groupId,
  initial,
}: {
  groupId: string;
  initial?: AcademyAssignmentDto;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState(initial?.type ?? 'CUSTOM_TASK');
  const [availableAt, setAvailableAt] = useState(
    toLocalInput(initial?.availableAt) || toLocalInput(new Date().toISOString()),
  );
  const [dueAt, setDueAt] = useState(toLocalInput(initial?.dueAt));
  const [lateCutoffAt, setLateCutoffAt] = useState(toLocalInput(initial?.lateCutoffAt));
  const [latePolicy, setLatePolicy] = useState(initial?.latePolicy ?? 'REJECT');
  const [latePenaltyPercent, setPenalty] = useState(initial?.latePenaltyPercent ?? 0);
  const [maxAttempts, setMaxAttempts] = useState(initial?.maxAttempts ?? 3);
  const [gradingType, setGradingType] = useState(initial?.gradingType ?? 'MANUAL');
  const [attemptSelection, setSelection] = useState(initial?.attemptSelection ?? 'LATEST_ATTEMPT');
  const [deliverables, setDeliverables] = useState((initial?.deliverables ?? []).join('\n'));
  const [items, setItems] = useState<ItemDraft[]>(
    initial?.items.map((i) => ({
      key: k(),
      id: i.id,
      kind: i.kind,
      stepId: i.step?.stepId,
      step: i.step,
      title: i.title,
      description: i.description,
      maxScore: i.maxScore,
    })) ?? [],
  );
  const [itemsDirty, setItemsDirty] = useState(!initial);
  const [picking, setPicking] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.maxScore) || 0), 0), [items]);
  const published = !!initial && initial.status !== 'DRAFT';

  const patchItem = (key: string, p: Partial<ItemDraft>) => {
    setItemsDirty(true);
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));
  };
  const addItem = (kind: AcademyItemKind) => {
    setItemsDirty(true);
    const key = k();
    setItems((xs) => [...xs, { key, kind, title: '', description: '', maxScore: 10 }]);
    if (kind === 'LEARNING_STEP') setPicking(key);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const full = {
      title,
      description,
      type,
      availableAt: fromLocalInput(availableAt),
      dueAt: fromLocalInput(dueAt),
      lateCutoffAt: fromLocalInput(lateCutoffAt),
      latePolicy,
      latePenaltyPercent: latePolicy === 'ACCEPT_WITH_PENALTY' ? Number(latePenaltyPercent) : 0,
      maxAttempts: Number(maxAttempts),
      gradingType,
      attemptSelection,
      deliverables: deliverables
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      items: items.map((i) => ({
        ...(i.id ? { id: i.id } : {}),
        kind: i.kind,
        ...(i.kind === 'LEARNING_STEP' ? { stepId: i.stepId } : { title: i.title }),
        description: i.description,
        maxScore: Number(i.maxScore),
      })),
    };
    try {
      if (!initial) {
        const { lateCutoffAt: cutoff, ...rest } = full;
        const r = await api<AcademyAssignmentDto>(`/academy/groups/${groupId}/assignments`, {
          method: 'POST',
          body: { ...rest, ...(cutoff ? { lateCutoffAt: cutoff } : {}) },
        });
        toast.success(t('academy.form.saved'));
        router.push(`/muellim/tapsiriqlar/${r.id}`);
        return;
      }
      // yalnız dəyişənlər
      const before: Record<string, unknown> = {
        title: initial.title,
        description: initial.description,
        type: initial.type,
        availableAt: initial.availableAt,
        dueAt: initial.dueAt,
        lateCutoffAt: initial.lateCutoffAt,
        latePolicy: initial.latePolicy,
        latePenaltyPercent: initial.latePenaltyPercent,
        maxAttempts: initial.maxAttempts,
        gradingType: initial.gradingType,
        attemptSelection: initial.attemptSelection,
        deliverables: initial.deliverables,
      };
      const body: Record<string, unknown> = { expectedVersion: initial.version };
      for (const [key, v] of Object.entries(full)) {
        if (key === 'items') continue;
        const old = before[key];
        const same = Array.isArray(v)
          ? JSON.stringify(v) === JSON.stringify(old)
          : (v ?? null) === (old ?? null);
        if (!same) body[key] = v;
      }
      if (itemsDirty) body.items = full.items;
      if (published && reason.trim()) body.reason = reason.trim();
      await api(`/academy/assignments/${initial.id}`, { method: 'PATCH', body });
      toast.success(t('academy.form.saved'));
      router.push(`/muellim/tapsiriqlar/${initial.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6"
      noValidate
      data-testid="assignment-form"
    >
      <section className="box flex flex-col gap-4">
        <Field label={t('academy.f.title')}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label={t('academy.f.description')}>
          <Textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={20_000}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('academy.f.type')}>
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {ACADEMY_ASSIGNMENT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`academy.type.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('academy.f.grading')}>
            <Select
              value={gradingType}
              onChange={(e) => setGradingType(e.target.value as typeof gradingType)}
            >
              {ACADEMY_GRADING_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`academy.gradingType.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('academy.f.maxAttempts')}>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('academy.f.available')}>
            <Input
              type="datetime-local"
              value={availableAt}
              onChange={(e) => setAvailableAt(e.target.value)}
              required
            />
          </Field>
          <Field label={t('academy.f.due')}>
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
            />
          </Field>
          <Field label={t('academy.f.cutoff')}>
            <Input
              type="datetime-local"
              value={lateCutoffAt}
              onChange={(e) => setLateCutoffAt(e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-muted">{t('academy.form.localTime')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('academy.f.latePolicy')}>
            <Select
              value={latePolicy}
              onChange={(e) => setLatePolicy(e.target.value as typeof latePolicy)}
            >
              {ACADEMY_LATE_POLICIES.map((x) => (
                <option key={x} value={x}>
                  {t(`academy.latePolicy.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          {latePolicy === 'ACCEPT_WITH_PENALTY' ? (
            <Field label={t('academy.f.penalty')}>
              <Input
                type="number"
                min={0}
                max={100}
                value={latePenaltyPercent}
                onChange={(e) => setPenalty(Number(e.target.value))}
              />
            </Field>
          ) : null}
          <Field label={t('academy.f.selection')}>
            <Select
              value={attemptSelection}
              onChange={(e) => setSelection(e.target.value as typeof attemptSelection)}
            >
              {ACADEMY_ATTEMPT_SELECTIONS.map((x) => (
                <option key={x} value={x}>
                  {t(`academy.selection.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('academy.f.deliverables')}>
          <Textarea
            rows={3}
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            placeholder={t('academy.form.deliverablesPh')}
          />
        </Field>
      </section>

      <section className="box flex flex-col gap-4">
        <div className="feed-h">
          <h2 className="box-h !mb-0">{t('academy.f.items')}</h2>
          <span className="text-sm font-semibold">
            {t('academy.form.total', { n: fmtScore(total) })}
          </span>
        </div>
        {items.map((i) => (
          <div key={i.key} className="ac-item" data-testid="assignment-item">
            <div className="ac-item-h">
              <span className="badge badge-muted">{t(`academy.itemKind.${i.kind}`)}</span>
              <button
                type="button"
                className="iconbtn"
                aria-label={t('academy.form.remove')}
                onClick={() => {
                  setItemsDirty(true);
                  setItems((xs) => xs.filter((x) => x.key !== i.key));
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {i.kind === 'LEARNING_STEP' ? (
              i.step && picking !== i.key ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <b className="block">{i.step.title}</b>
                    <span className="text-xs text-muted">
                      {i.step.courseTitle} · {i.step.type}
                    </span>
                    {!i.step.available ? (
                      <span className="block text-xs text-error">
                        {t('academy.form.unavailable')}
                      </span>
                    ) : null}
                  </span>
                  {!i.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setPicking(i.key)}
                    >
                      <Search className="size-3.5" />
                      {t('academy.form.searchStep')}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <StepPicker
                  onPick={(s) => {
                    patchItem(i.key, { stepId: s.stepId, step: s, title: s.title });
                    setPicking(null);
                  }}
                />
              )
            ) : (
              <>
                <Field label={t('academy.form.itemTitle')}>
                  <Input
                    value={i.title}
                    onChange={(e) => patchItem(i.key, { title: e.target.value })}
                    maxLength={200}
                  />
                </Field>
                <Field label={t('academy.f.description')}>
                  <Textarea
                    rows={2}
                    value={i.description}
                    onChange={(e) => patchItem(i.key, { description: e.target.value })}
                  />
                </Field>
              </>
            )}
            <Field label={t('academy.f.maxScore')} className="max-w-40">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={i.maxScore}
                onChange={(e) => patchItem(i.key, { maxScore: Number(e.target.value) })}
              />
            </Field>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {ACADEMY_ITEM_KINDS.map((kind) => (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addItem(kind)}
              data-testid={`add-item-${kind}`}
            >
              <Plus className="size-4" />
              {t(`academy.itemKind.${kind}`)}
            </Button>
          ))}
        </div>
      </section>

      {published ? (
        <Field label={t('academy.f.reason')}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      ) : null}
      {error ? (
        <p className="text-sm text-error" role="alert" data-testid="assignment-form-error">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        loading={busy}
        disabled={!title.trim() || !dueAt || items.length === 0}
        className="self-start"
      >
        {initial ? t('academy.form.saveChanges') : t('academy.form.save')}
      </Button>
    </form>
  );
}
