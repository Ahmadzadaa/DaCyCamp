'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileUp, Paperclip, Save, Send, X } from 'lucide-react';
import {
  ACADEMY_DEFAULTS,
  ACADEMY_FILE_EXTENSIONS,
  type AcademyFileDto,
  type AcademyItemDto,
  type AcademySubmitReceiptDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { newIdempotencyKey } from './format';

type Answer = { text?: string; code?: string; link?: string; fileIds?: string[] };

/**
 * Tələbənin cavab formu: mətn / kod / link / fayl elementləri, qaralama, göndəriş. Göndəriş açarı (idempotency)
 * forma açılanda yaradılır — iki klik və ya şəbəkə təkrarı yeni cəhd yaratmır; uğurdan sonra yenilənir.
 */
export function AnswerPanel({
  assignmentId,
  items,
  draft,
  stagedFiles,
  attemptsLeft,
  unsolvedSteps,
}: {
  assignmentId: string;
  items: AcademyItemDto[];
  draft: Array<{ itemId: string } & Answer> | null;
  stagedFiles: AcademyFileDto[];
  attemptsLeft: number;
  unsolvedSteps: number;
}) {
  const router = useRouter();
  const answerable = items.filter((i) => i.kind !== 'LEARNING_STEP');
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries((draft ?? []).map(({ itemId, ...a }) => [itemId, a])),
  );
  const [files, setFiles] = useState<AcademyFileDto[]>(stagedFiles);
  const [busy, setBusy] = useState<'draft' | 'submit' | string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const fileById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);

  const set = (itemId: string, patch: Answer) =>
    setAnswers((a) => ({ ...a, [itemId]: { ...a[itemId], ...patch } }));
  const payload = () =>
    answerable
      .map((i) => ({ itemId: i.id, ...answers[i.id] }))
      .map((a) =>
        Object.fromEntries(
          Object.entries(a).filter(([, v]) =>
            Array.isArray(v) ? v.length : v !== undefined && v !== '',
          ),
        ),
      )
      .filter((a) => Object.keys(a).length > 1) as Array<{ itemId: string } & Answer>;

  async function upload(itemId: string, file: File) {
    setBusy(itemId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const f = await api<AcademyFileDto>(`/academy/me/assignments/${assignmentId}/files`, {
        method: 'POST',
        body: fd,
      });
      setFiles((xs) => [...xs, f]);
      set(itemId, { fileIds: [...(answers[itemId]?.fileIds ?? []), f.id] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function removeFile(itemId: string, fileId: string) {
    set(itemId, { fileIds: (answers[itemId]?.fileIds ?? []).filter((x) => x !== fileId) });
    try {
      await api(`/academy/me/files/${fileId}`, { method: 'DELETE' });
      setFiles((xs) => xs.filter((f) => f.id !== fileId));
    } catch {
      /* fayl artıq silinib və ya bağlanıb — formdan çıxarmaq kifayətdir */
    }
  }

  async function saveDraft() {
    setBusy('draft');
    setError(null);
    try {
      await api(`/academy/me/assignments/${assignmentId}/draft`, {
        method: 'PUT',
        body: { answers: payload() },
      });
      toast.success(t('academy.detail.draftSaved'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy('submit');
    setError(null);
    try {
      const r = await api<AcademySubmitReceiptDto>(
        `/academy/me/assignments/${assignmentId}/attempts`,
        {
          method: 'POST',
          body: { idempotencyKey: key.current, answers: payload() },
        },
      );
      key.current = newIdempotencyKey();
      setConfirm(false);
      toast.success(t('academy.detail.submitted', { n: r.attemptNumber }));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setConfirm(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="academy-answer-panel">
      {answerable.map((i) => {
        const a = answers[i.id] ?? {};
        return (
          <div key={i.id} className="ac-item">
            <div className="ac-item-h">
              <b>{i.title}</b>
              <span className="text-sm text-muted">
                {t(`academy.itemKind.${i.kind}`)} · {i.maxScore}{' '}
                {t('academy.f.score').toLowerCase()}
              </span>
            </div>
            {i.description ? <p className="text-sm text-muted">{i.description}</p> : null}
            {i.kind === 'TEXT' ? (
              <Textarea
                rows={6}
                value={a.text ?? ''}
                onChange={(e) => set(i.id, { text: e.target.value })}
                placeholder={t('academy.detail.answerPh')}
                aria-label={i.title}
                maxLength={50_000}
              />
            ) : null}
            {i.kind === 'CODE' ? (
              <Textarea
                code
                rows={10}
                value={a.code ?? ''}
                onChange={(e) => set(i.id, { code: e.target.value })}
                placeholder={t('academy.detail.codePh')}
                aria-label={i.title}
                maxLength={100_000}
              />
            ) : null}
            {i.kind === 'LINK' ? (
              <Input
                type="url"
                inputMode="url"
                value={a.link ?? ''}
                onChange={(e) => set(i.id, { link: e.target.value })}
                placeholder="https://"
                aria-label={i.title}
              />
            ) : null}
            {i.kind === 'FILE' ? (
              <div className="flex flex-col gap-2">
                <div className="ac-files">
                  {(a.fileIds ?? []).map((id) => {
                    const f = fileById.get(id);
                    return (
                      <span key={id} className="ac-file">
                        <Paperclip className="size-4 shrink-0" aria-hidden />
                        <span>{f?.filename ?? id}</span>
                        <button
                          type="button"
                          className="iconbtn"
                          onClick={() => removeFile(i.id, id)}
                          aria-label={t('academy.detail.removeFile')}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <label className="b b-ghost b-sm self-start">
                  <FileUp className="size-4" aria-hidden />
                  {busy === i.id ? '…' : t('academy.detail.upload')}
                  <input
                    type="file"
                    className="sr-only"
                    accept={ACADEMY_FILE_EXTENSIONS.map((x) => `.${x}`).join(',')}
                    disabled={busy !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void upload(i.id, f);
                    }}
                    data-testid="academy-file-input"
                  />
                </label>
                <span className="text-xs text-muted">
                  {t('academy.detail.allowed', {
                    types: ACADEMY_FILE_EXTENSIONS.join(', '),
                    mb: ACADEMY_DEFAULTS.maxFileMb,
                  })}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}

      {error ? (
        <p className="text-sm text-error" role="alert" data-testid="academy-answer-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {answerable.length ? (
          <Button
            variant="ghost"
            onClick={saveDraft}
            loading={busy === 'draft'}
            disabled={busy !== null && busy !== 'draft'}
          >
            <Save className="size-4" />
            {t('academy.detail.saveDraft')}
          </Button>
        ) : null}
        <Button
          onClick={() => setConfirm(true)}
          disabled={busy !== null}
          data-testid="academy-submit"
        >
          <Send className="size-4" />
          {t('academy.detail.submit')}
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          title={t('academy.detail.confirmTitle')}
          description={t('academy.detail.confirmDesc', { left: Math.max(0, attemptsLeft - 1) })}
        >
          {unsolvedSteps > 0 ? (
            <p className="mb-4 text-sm text-error">
              {t('academy.detail.confirmUnsolved', { n: unsolvedSteps })}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={submit}
              loading={busy === 'submit'}
              data-testid="academy-submit-confirm"
            >
              <Send className="size-4" />
              {t('academy.detail.submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
