'use client';
import { Plus, Trash2 } from 'lucide-react';
import type { AssetDto, StepDefinitionDraft } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Seg } from '../seg';
import { AssetPicker } from '../asset-picker';
import { linesToText, textToLines } from '../lines';

type Sql = Extract<StepDefinitionDraft, { type: 'sql' }>;
type Py = Extract<StepDefinitionDraft, { type: 'python' }>;
type Term = Extract<StepDefinitionDraft, { type: 'terminal' }>;
type Ctf = Extract<StepDefinitionDraft, { type: 'ctf' }>;

interface Ctx {
  courseId: string;
  assets: AssetDto[];
  onAssetUploaded: (a: AssetDto) => void;
}
const asList = (d: string | string[] | undefined) =>
  d === undefined ? [] : Array.isArray(d) ? d : [d];
const asDataset = (xs: string[]) => (xs.length === 0 ? undefined : xs.length === 1 ? xs[0] : xs);

function HintsTasks({
  hints,
  tasks,
  penalty,
  onChange,
  penaltyDefault,
}: {
  hints: string[] | undefined;
  tasks: string[] | undefined;
  penalty: number | undefined;
  onChange: (p: { hints?: string[]; tasks?: string[]; hint_penalty_xp?: number }) => void;
  penaltyDefault: number;
}) {
  return (
    <>
      <Field label={t('admin.hints')} hint={t('admin.hintsHint')}>
        <Textarea
          value={linesToText(hints)}
          onChange={(e) => onChange({ hints: textToLines(e.target.value) })}
          rows={3}
        />
      </Field>
      <Field label={t('admin.tasksList')}>
        <Textarea
          value={linesToText(tasks)}
          onChange={(e) => onChange({ tasks: textToLines(e.target.value) })}
          rows={3}
        />
      </Field>
      <Field label={t('admin.hintPenalty')}>
        <Input
          type="number"
          min={0}
          value={penalty ?? penaltyDefault}
          onChange={(e) => onChange({ hint_penalty_xp: Number(e.target.value) })}
        />
      </Field>
    </>
  );
}

export function SqlForm({
  def,
  onChange,
  ctx,
}: {
  def: Sql;
  onChange: (p: Partial<Sql>) => void;
  ctx: Ctx;
}) {
  return (
    <>
      <Field label={t('admin.instructions')} full>
        <Textarea
          value={def.instructions ?? ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={5}
        />
      </Field>
      <Field label={t('admin.dataset')} hint={t('admin.selectDatasets')} full>
        <AssetPicker
          assets={ctx.assets}
          value={asList(def.dataset)}
          onChange={(xs) => onChange({ dataset: asDataset(xs) })}
          kinds={['DATASET', 'ATTACHMENT', 'OTHER']}
          folder="datasets"
          uploadKind="DATASET"
          courseId={ctx.courseId}
          onAssetUploaded={ctx.onAssetUploaded}
          emptyText={t('admin.noDatasets')}
        />
      </Field>
      <Field label={t('admin.starterCode')}>
        <Textarea
          code
          value={def.starter_code ?? ''}
          onChange={(e) => onChange({ starter_code: e.target.value })}
          rows={6}
        />
      </Field>
      <Field label={t('admin.solution')}>
        <Textarea
          code
          value={def.solution ?? ''}
          onChange={(e) => onChange({ solution: e.target.value })}
          rows={6}
        />
      </Field>
      <Field label={t('admin.checkMode')}>
        <Seg
          value={def.check ?? 'result_match'}
          onChange={(check) => onChange({ check })}
          options={[
            { value: 'result_match', label: 'result_match (sıra vacib)' },
            { value: 'result_match_unordered', label: 'result_match_unordered' },
          ]}
          label={t('admin.checkMode')}
        />
      </Field>
      <HintsTasks
        hints={def.hints}
        tasks={def.tasks}
        penalty={def.hint_penalty_xp}
        onChange={onChange}
        penaltyDefault={10}
      />
    </>
  );
}

export function PythonForm({
  def,
  onChange,
  ctx,
}: {
  def: Py;
  onChange: (p: Partial<Py>) => void;
  ctx: Ctx;
}) {
  return (
    <>
      <Field label={t('admin.instructions')} full>
        <Textarea
          value={def.instructions ?? ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={5}
        />
      </Field>
      <Field label={t('admin.dataset')} hint={t('admin.selectDatasets')} full>
        <AssetPicker
          assets={ctx.assets}
          value={asList(def.dataset)}
          onChange={(xs) => onChange({ dataset: asDataset(xs) })}
          kinds={['DATASET', 'ATTACHMENT', 'OTHER']}
          folder="datasets"
          uploadKind="DATASET"
          courseId={ctx.courseId}
          onAssetUploaded={ctx.onAssetUploaded}
          emptyText={t('admin.noDatasets')}
        />
      </Field>
      <Field label={t('admin.starterCode')}>
        <Textarea
          code
          value={def.starter_code ?? ''}
          onChange={(e) => onChange({ starter_code: e.target.value })}
          rows={6}
        />
      </Field>
      <Field label={`${t('admin.solution')} (${t('common.optional')})`}>
        <Textarea
          code
          value={def.solution ?? ''}
          onChange={(e) => onChange({ solution: e.target.value || undefined })}
          rows={6}
        />
      </Field>
      <Field
        label={t('admin.tests')}
        full
        hint="Hər assert tələbə kodundan sonra işləyir; hamısı keçərsə tapşırıq həll olunub."
      >
        <Textarea
          code
          value={def.tests ?? ''}
          onChange={(e) => onChange({ tests: e.target.value })}
          rows={5}
        />
      </Field>
      <HintsTasks
        hints={def.hints}
        tasks={def.tasks}
        penalty={def.hint_penalty_xp}
        onChange={onChange}
        penaltyDefault={10}
      />
    </>
  );
}

export function TerminalForm({
  def,
  onChange,
  ctx,
}: {
  def: Term;
  onChange: (p: Partial<Term>) => void;
  ctx: Ctx;
}) {
  return (
    <>
      <div className="rounded-lg border border-de/50 bg-de/10 px-4 py-2 text-sm md:col-span-2">
        {t('admin.formLater', { phase: 3 })} (forma hazırdır, konteyner Mərhələ 3-də)
      </div>
      <Field label={t('admin.instructions')} full>
        <Textarea
          value={def.instructions ?? ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={5}
        />
      </Field>
      <Field label={t('admin.dockerImage')}>
        <Input
          value={def.docker_image ?? ''}
          onChange={(e) => onChange({ docker_image: e.target.value })}
          placeholder="dacy/de-lab-postgres:latest"
          className="font-mono"
        />
      </Field>
      <Field label={t('admin.timeLimit')}>
        <Input
          type="number"
          min={1}
          max={600}
          value={def.time_limit_minutes ?? 60}
          onChange={(e) => onChange({ time_limit_minutes: Number(e.target.value) })}
        />
      </Field>
      <Field label={t('admin.checkScript')} hint={t('admin.selectCheckScript')} full>
        <AssetPicker
          assets={ctx.assets}
          value={def.check_script ? [def.check_script] : []}
          onChange={(xs) => onChange({ check_script: xs[0] })}
          kinds={['CHECK_SCRIPT']}
          folder="checks"
          uploadKind="CHECK_SCRIPT"
          courseId={ctx.courseId}
          onAssetUploaded={ctx.onAssetUploaded}
          multiple={false}
        />
      </Field>
      <HintsTasks
        hints={def.hints}
        tasks={def.tasks}
        penalty={def.hint_penalty_xp}
        onChange={onChange}
        penaltyDefault={0}
      />
    </>
  );
}

type CtfTask = NonNullable<Ctf['tasks']>[number];
const emptyTask = (): CtfTask => ({ question: '', answer: '', points: 0, case_sensitive: false });

export function CtfForm({
  def,
  onChange,
  ctx,
}: {
  def: Ctf;
  onChange: (p: Partial<Ctf>) => void;
  ctx: Ctx;
}) {
  const tasks = def.tasks ?? [];
  const setTask = (i: number, p: Partial<CtfTask>) =>
    onChange({ tasks: tasks.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  return (
    <>
      <Field label={t('admin.instructions')} full>
        <Textarea
          value={def.instructions ?? ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={5}
        />
      </Field>
      <Field label={t('admin.attachments')} hint={t('admin.selectAttachments')} full>
        <AssetPicker
          assets={ctx.assets}
          value={def.attachments ?? []}
          onChange={(xs) => onChange({ attachments: xs })}
          kinds={['ATTACHMENT', 'DATASET', 'PDF', 'IMAGE', 'OTHER']}
          folder="files"
          uploadKind="ATTACHMENT"
          courseId={ctx.courseId}
          onAssetUploaded={ctx.onAssetUploaded}
        />
      </Field>
      <Field label={`${t('admin.dockerImage')} (${t('common.optional')}, Mərhələ 3)`}>
        <Input
          value={def.docker_image ?? ''}
          onChange={(e) => onChange({ docker_image: e.target.value || undefined })}
          className="font-mono"
        />
      </Field>
      <Field label={t('admin.hintPenalty')}>
        <Input
          type="number"
          min={0}
          value={def.hint_penalty_xp ?? 10}
          onChange={(e) => onChange({ hint_penalty_xp: Number(e.target.value) })}
        />
      </Field>
      <div className="flex flex-col gap-3 md:col-span-2">
        <span className="text-sm font-semibold">
          {t('admin.ctfTasks')} ({tasks.length})
        </span>
        {tasks.map((task, i) => (
          <div key={i} className="box grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between md:col-span-2">
              <b className="text-sm">
                {i + 1}.
                {task.key ? (
                  <span className="ml-2 font-mono text-xs text-muted">{task.key}</span>
                ) : null}
              </b>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => onChange({ tasks: tasks.filter((_, k) => k !== i) })}
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Field label={t('admin.question')} full>
              <Textarea
                value={task.question ?? ''}
                onChange={(e) => setTask(i, { question: e.target.value })}
                rows={2}
              />
            </Field>
            <Field
              label={task.answer_hash ? t('admin.newAnswer') : t('admin.answer')}
              hint={
                task.answer_hash
                  ? `${t('admin.answerStored')}: ${task.answer_hash.slice(0, 12)}…`
                  : undefined
              }
            >
              <Input
                value={task.answer ?? ''}
                onChange={(e) => setTask(i, { answer: e.target.value })}
                className="font-mono"
                autoComplete="off"
                placeholder={task.answer_hash ? '••••••' : 'DACY{...}'}
              />
            </Field>
            <Field label={t('admin.points')}>
              <Input
                type="number"
                min={0}
                value={task.points ?? 0}
                onChange={(e) => setTask(i, { points: Number(e.target.value) })}
              />
            </Field>
            <Field label={`${t('admin.hints')} (${t('common.optional')})`}>
              <Input
                value={task.hint ?? ''}
                onChange={(e) => setTask(i, { hint: e.target.value || undefined })}
              />
            </Field>
            <Field label={t('admin.caseSensitive')}>
              <label className="flex items-center gap-3 py-1 text-sm font-normal">
                <Switch
                  checked={task.case_sensitive ?? false}
                  onCheckedChange={(v) => setTask(i, { case_sensitive: v })}
                />
                <span>{task.case_sensitive ? t('common.yes') : t('common.no')}</span>
              </label>
            </Field>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="dark"
            onClick={() => onChange({ tasks: [...tasks, emptyTask()] })}
          >
            <Plus className="size-4" />
            {t('admin.addTask')}
          </Button>
        </div>
      </div>
    </>
  );
}
