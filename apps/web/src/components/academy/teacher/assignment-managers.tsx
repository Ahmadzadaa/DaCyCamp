'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Download, FileUp, Plus, Trash2, X } from 'lucide-react';
import {
  ACADEMY_FILE_EXTENSIONS,
  type AcademyEnrollmentDto,
  type AcademyExtensionDto,
  type AcademyFileDto,
  type AcademyRubricDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { fmtScore, fmtZoned, fromLocalInput } from '../format';

/** Tapşırıq resursları (yükləmə / silmə) */
export function ResourcesManager({
  assignmentId,
  files,
  canEdit,
}: {
  assignmentId: string;
  files: AcademyFileDto[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function upload(f: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      await api(`/academy/assignments/${assignmentId}/resources`, { method: 'POST', body: fd });
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await api(`/academy/assignments/${assignmentId}/resources/${id}`, { method: 'DELETE' });
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="ac-files">
        {files.map((f) => (
          <span key={f.id} className="ac-file">
            <a
              href={`/api/academy/files/${f.id}`}
              download
              className="inline-flex min-w-0 items-center gap-1.5"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              <span>{f.filename}</span>
            </a>
            {canEdit ? (
              <button
                type="button"
                className="iconbtn"
                onClick={() => remove(f.id)}
                aria-label={t('academy.form.remove')}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {canEdit ? (
        <label className="b b-ghost b-sm self-start">
          <FileUp className="size-4" aria-hidden />
          {busy ? '…' : t('academy.teacher.addResource')}
          <input
            type="file"
            className="sr-only"
            accept={ACADEMY_FILE_EXTENSIONS.map((x) => `.${x}`).join(',')}
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void upload(f);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

/** Fərdi son tarix uzadılmaları (yalnız aparıcı / admin) */
export function ExtensionsManager({
  assignmentId,
  extensions,
  roster,
  canEdit,
  timezone,
}: {
  assignmentId: string;
  extensions: AcademyExtensionDto[];
  roster: AcademyEnrollmentDto[];
  canEdit: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [due, setDue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const eligible = roster.filter((e) => e.status === 'ACTIVE' || e.status === 'PAUSED');
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/academy/assignments/${assignmentId}/extensions`, {
        method: 'POST',
        body: { studentId, extendedDueAt: fromLocalInput(due), reason },
      });
      setStudentId('');
      setDue('');
      setReason('');
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function remove(sid: string) {
    try {
      await api(`/academy/assignments/${assignmentId}/extensions/${sid}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {extensions.length ? (
        <ul className="sup-list">
          {extensions.map((x) => (
            <li key={x.id} className="ac-row py-2">
              <span className="flex min-w-0 flex-col">
                <b>{x.student.name}</b>
                <span className="ac-meta">
                  <span>
                    {t('academy.teacher.newDue')}:{' '}
                    <b>{fmtZoned(x.extendedDueAt, { tz: timezone })}</b>
                  </span>
                  <span>{x.reason}</span>
                </span>
              </span>
              {canEdit ? (
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => remove(x.student.id)}
                  aria-label={t('academy.teacher.removeExtension')}
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <form
          onSubmit={add}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          data-testid="extension-form"
        >
          <Field label={t('academy.f.student')}>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">—</option>
              {eligible.map((e) => (
                <option key={e.student.id} value={e.student.id}>
                  {e.student.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('academy.teacher.newDue')}>
            <Input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              required
            />
          </Field>
          <Field label={t('academy.f.reason')} className="sm:col-span-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
            />
          </Field>
          <Button
            type="submit"
            size="sm"
            loading={busy}
            disabled={!studentId || !due || !reason.trim()}
            className="self-start"
          >
            <Plus className="size-4" />
            {t('academy.teacher.addExtension')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Rubrika: meyarların cəmi = tapşırığın maksimumu; qiymət yazılandan sonra kilidlənir (server) */
export function RubricEditor({
  assignmentId,
  rubric,
  maxScore,
  canEdit,
}: {
  assignmentId: string;
  rubric: AcademyRubricDto | null;
  maxScore: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(rubric?.title ?? t('academy.teacher.rubric'));
  const [criteria, setCriteria] = useState(
    rubric?.criteria.map((c) => ({
      title: c.title,
      description: c.description,
      maxScore: c.maxScore,
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const total = Math.round(criteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0) * 100) / 100;
  async function save() {
    setBusy(true);
    try {
      await api(`/academy/assignments/${assignmentId}/rubric`, {
        method: 'PUT',
        body: { title, criteria },
      });
      toast.success(t('academy.form.saved'));
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!canEdit)
    return rubric ? (
      <ul className="flex flex-col gap-1 text-sm">
        {rubric.criteria.map((c) => (
          <li key={c.id} className="flex justify-between gap-3">
            <span>{c.title}</span>
            <b>{fmtScore(c.maxScore)}</b>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted">—</p>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{t('academy.teacher.rubricHint')}</p>
      <Field label={t('academy.f.title')}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      {criteria.map((c, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-end gap-2">
          <Field label={i === 0 ? t('academy.f.title') : undefined}>
            <Input
              value={c.title}
              onChange={(e) =>
                setCriteria((xs) =>
                  xs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                )
              }
            />
          </Field>
          <Field label={i === 0 ? t('academy.f.maxScore') : undefined}>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={c.maxScore}
              onChange={(e) =>
                setCriteria((xs) =>
                  xs.map((x, j) => (j === i ? { ...x, maxScore: Number(e.target.value) } : x)),
                )
              }
            />
          </Field>
          <button
            type="button"
            className="iconbtn mb-1"
            onClick={() => setCriteria((xs) => xs.filter((_, j) => j !== i))}
            aria-label={t('academy.form.remove')}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCriteria((xs) => [...xs, { title: '', description: '', maxScore: 10 }])}
        >
          <Plus className="size-4" />
          {t('academy.teacher.addCriterion')}
        </Button>
        <span className={total === maxScore ? 'text-sm text-ok-ink' : 'text-sm text-error-ink'}>
          {fmtScore(total)} / {fmtScore(maxScore)}
        </span>
      </div>
      <Button
        size="sm"
        onClick={save}
        loading={busy}
        disabled={!criteria.length || total !== maxScore}
        className="self-start"
      >
        {t('academy.teacher.saveRubric')}
      </Button>
    </div>
  );
}
