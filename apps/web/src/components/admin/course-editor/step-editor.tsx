'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Trash2 } from 'lucide-react';
import {
  emptyDefinition,
  STEP_TYPES,
  stepTypeFromSlug,
  type AdminStepDto,
  type AdminStepNode,
  type AssetDto,
  type Issue,
  type StepDefinitionDraft,
  type StepType,
} from '@dacy/shared';
import { api, ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Seg } from '../seg';
import { ConfirmDialog } from '../confirm-dialog';
import { StatusBadge } from '../status-badge';
import { useAdmin } from '../admin-context';
import { IssuesBox } from './issues-box';
import { TheoryForm } from './theory-form';
import { QuizForm, type QuizValues } from './quiz-form';
import { ReadonlyDefinition } from './readonly-definition';
import { CtfForm, PythonForm, SqlForm, TerminalForm } from './code-forms';

const TYPE_OPTIONS = STEP_TYPES.map((x) => ({ value: x, label: t(`stepTypeShort.${x}`) }));

interface Props {
  stepId: string;
  courseId: string;
  courseSlug: string;
  moduleKey: string;
  stepKey: string;
  assets: AssetDto[];
  onAssetUploaded: (a: AssetDto) => void;
  onMeta: (p: Partial<AdminStepNode>) => void;
  onDeleted: () => void;
}

export function StepEditor({
  stepId,
  courseId,
  courseSlug,
  moduleKey,
  stepKey,
  assets,
  onAssetUploaded,
  onMeta,
  onDeleted,
}: Props) {
  const { isAdmin } = useAdmin();
  const [dto, setDto] = useState<AdminStepDto | null>(null);
  const [def, setDef] = useState<StepDefinitionDraft | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [needForce, setNeedForce] = useState(false);

  useEffect(() => {
    let alive = true;
    api<AdminStepDto>(`/admin/steps/${stepId}`)
      .then((d) => {
        if (!alive) return;
        setDto(d);
        setDef(d.definition);
        setIssues(d.issues);
      })
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [stepId]);

  function update(patch: Partial<StepDefinitionDraft>) {
    setDef((d) => (d ? ({ ...d, ...patch } as StepDefinitionDraft) : d));
    setDirty(true);
  }

  function changeType(next: StepType) {
    if (!def) return;
    const base = emptyDefinition(next, def.title);
    setDef({
      ...base,
      xp: def.xp ?? base.xp,
      ...(def.estimated_minutes != null ? { estimated_minutes: def.estimated_minutes } : {}),
    } as StepDefinitionDraft);
    setDirty(true);
  }

  function applyDto(d: AdminStepDto) {
    setDto(d);
    setDef(d.definition);
    setIssues(d.issues);
    setDirty(false);
    onMeta({
      title: d.definition.title,
      xp: d.definition.xp ?? 0,
      type: d.type,
      isPublished: d.isPublished,
      hasProgress: d.hasProgress,
    });
  }

  async function save() {
    if (!def) return;
    setBusy('save');
    setError(null);
    try {
      const d = await api<AdminStepDto>(`/admin/steps/${stepId}`, { method: 'PUT', body: def });
      applyDto(d);
      toast.success(t('admin.stepSaved'));
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.details)) setIssues(e.details as Issue[]);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function togglePublish() {
    if (!dto) return;
    setBusy('publish');
    setError(null);
    try {
      const d = await api<AdminStepDto>(`/admin/steps/${stepId}/publish`, {
        method: 'PATCH',
        body: { isPublished: !dto.isPublished },
      });
      applyDto(d);
      toast.success(d.isPublished ? t('admin.publishedOk') : t('admin.unpublishedOk'));
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.details)) setIssues(e.details as Issue[]);
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove(force = false) {
    setDelError(null);
    try {
      await api(`/admin/steps/${stepId}${force ? '?force=1' : ''}`, { method: 'DELETE' });
      toast.success(t('admin.deleted'));
      setDelOpen(false);
      onDeleted();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'STEP_HAS_PROGRESS') setNeedForce(true);
      setDelError(errorMessage(e));
    }
  }

  if (error && !dto)
    return (
      <p role="alert" className="text-sm text-error">
        {error}
      </p>
    );
  if (!dto || !def) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const type = stepTypeFromSlug(def.type);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-muted">{t(`stepType.${type}`)}</span>
            <StatusBadge published={dto.isPublished} />
            {dirty ? <span className="text-xs text-de">{t('common.unsaved')}</span> : null}
          </div>
          <h2 className="mt-1.5 truncate text-[1.3rem]">{def.title || '—'}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              window.open(`/kurs/${courseSlug}/${moduleKey}/${stepKey}?onizle=1`, '_blank')
            }
          >
            <Eye className="size-4" />
            {t('common.previewAsStudent')}
          </Button>
          <Button
            type="button"
            variant={dto.isPublished ? 'dark' : 'brand'}
            loading={busy === 'publish'}
            onClick={togglePublish}
          >
            {dto.isPublished ? t('common.draft') : t('common.publish')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setNeedForce(false);
              setDelError(null);
              setDelOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <IssuesBox title={t('admin.publishIssues')} issues={issues} />
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid gap-4 md:grid-cols-2"
        noValidate
      >
        <Field
          label={t('admin.stepType')}
          full
          hint={dto.hasProgress ? t('errors.STEP_TYPE_LOCKED') : undefined}
        >
          <Seg
            value={type}
            onChange={changeType}
            options={TYPE_OPTIONS}
            disabled={dto.hasProgress}
            label={t('admin.stepType')}
          />
        </Field>
        <Field label={t('common.title')}>
          <Input
            value={def.title}
            onChange={(e) => update({ title: e.target.value })}
            required
            maxLength={200}
          />
        </Field>
        <Field label={t('admin.xp')}>
          <Input
            type="number"
            min={0}
            max={10000}
            value={def.xp ?? 0}
            onChange={(e) => update({ xp: Number(e.target.value) })}
          />
        </Field>
        <Field label={t('admin.key')} hint={t('admin.keyHint')}>
          <Input value={dto.key} readOnly className="font-mono text-muted" />
        </Field>
        <Field label={t('admin.estimatedMinutes')}>
          <Input
            type="number"
            min={0}
            value={def.estimated_minutes ?? ''}
            onChange={(e) =>
              update({
                estimated_minutes: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>

        {def.type === 'theory' ? (
          <TheoryForm
            values={{ content: def.content ?? '', video_url: def.video_url ?? '' }}
            onChange={(v) => update({ content: v.content, video_url: v.video_url || undefined })}
            courseId={courseId}
            assets={assets}
            onAssetUploaded={onAssetUploaded}
          />
        ) : def.type === 'quiz' ? (
          <QuizForm
            values={{
              pass_score: def.pass_score ?? 70,
              shuffle_questions: def.shuffle_questions ?? false,
              questions: (def.questions ?? []).map((q) => ({
                text: q.text ?? '',
                type: q.type ?? 'single',
                options: q.options ?? [],
                correct: q.correct ?? [],
                explanation: q.explanation,
              })),
            }}
            onChange={(v: QuizValues) =>
              update({
                pass_score: v.pass_score,
                shuffle_questions: v.shuffle_questions,
                questions: v.questions.map((q) => ({
                  ...q,
                  explanation: q.explanation || undefined,
                })),
              })
            }
          />
        ) : def.type === 'sql' ? (
          <SqlForm
            def={def}
            onChange={(p) => update(p as Partial<StepDefinitionDraft>)}
            ctx={{ courseId, assets, onAssetUploaded }}
          />
        ) : def.type === 'python' ? (
          <PythonForm
            def={def}
            onChange={(p) => update(p as Partial<StepDefinitionDraft>)}
            ctx={{ courseId, assets, onAssetUploaded }}
          />
        ) : def.type === 'terminal' ? (
          <TerminalForm
            def={def}
            onChange={(p) => update(p as Partial<StepDefinitionDraft>)}
            ctx={{ courseId, assets, onAssetUploaded }}
          />
        ) : def.type === 'ctf' ? (
          <CtfForm
            def={def}
            onChange={(p) => update(p as Partial<StepDefinitionDraft>)}
            ctx={{ courseId, assets, onAssetUploaded }}
          />
        ) : (
          <ReadonlyDefinition def={def} />
        )}

        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="submit" loading={busy === 'save'}>
            {t('common.save')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={t('admin.deleteStep')}
        description={def.title}
        onConfirm={() => remove(false)}
        error={delError}
      >
        {needForce && isAdmin ? (
          <div className="rounded-lg border border-de/50 bg-de/10 px-3 py-2 text-sm">
            <p>{t('admin.hasProgress')}</p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-2"
              onClick={() => remove(true)}
            >
              {t('admin.forceDelete')}
            </Button>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
