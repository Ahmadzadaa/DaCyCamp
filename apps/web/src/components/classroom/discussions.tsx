'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleHelp, LockKeyhole, MessageSquare, Plus, Send } from 'lucide-react';
import {
  classroomQuestionSchema,
  type ClassroomQuestionDto,
  type ClassroomReplyDto,
  type ClassroomPage,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Markdown } from '@/components/app/markdown';
import { fmtZoned } from '@/components/academy/format';
import { ClassroomAction } from './actions';

export function Discussion({
  kind,
  id,
  readOnly = false,
  initial,
}: {
  kind: 'announcement' | 'question';
  id: string;
  readOnly?: boolean;
  initial?: ClassroomReplyDto[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ClassroomReplyDto[] | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const path = `/academy/classroom/${kind === 'question' ? 'questions' : 'announcements'}/${id}/replies`;
  const load = useCallback(async () => {
    try {
      const result =
        kind === 'question'
          ? (await api<{ replies: ClassroomReplyDto[] }>(`/academy/classroom/questions/${id}`))
              .replies
          : await api<ClassroomReplyDto[]>(path);
      setRows(result);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, kind, path]);
  useEffect(() => {
    if (initial && !revision) setRows(initial);
    else void load();
  }, [initial, load, revision]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: 'POST', body: { body: body.trim() } });
      setBody('');
      await load();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cr-discussion" data-testid="classroom-discussion">
      {rows === null && !error ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : null}
      <ul className="cr-replies">
        {rows?.map((r) => (
          <li key={r.id}>
            <span className={`cr-avatar ${r.isStaff ? 'staff' : ''}`} aria-hidden>
              {r.authorName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="cr-reply-meta">
                <b>{r.authorName}</b>
                {r.isStaff ? <span className="cr-tag">{t('classroom.instructor')}</span> : null}
                <time dateTime={r.createdAt}>{fmtZoned(r.createdAt)}</time>
              </div>
              <Markdown content={r.body} />
            </div>
            {r.canHide ? (
              <ClassroomAction
                path={`/academy/classroom/replies/${r.id}/hide`}
                confirm="hide"
                onDone={() => setRevision((n) => n + 1)}
              >
                {t('classroom.hideReply')}
              </ClassroomAction>
            ) : null}
          </li>
        ))}
      </ul>
      {error ? (
        <div className="cr-inline-error" role="alert">
          {error}
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
            {t('classroom.retry')}
          </Button>
        </div>
      ) : null}
      {readOnly ? (
        <p className="text-sm text-muted">{t('classroom.commentsClosed')}</p>
      ) : (
        <form onSubmit={send} className="cr-reply-form">
          <label className="sr-only" htmlFor={`reply-${id}`}>
            {t('classroom.writeReply')}
          </label>
          <textarea
            id={`reply-${id}`}
            className="inp"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('classroom.writeReply')}
            maxLength={5000}
            required
          />
          <Button type="submit" size="sm" loading={busy} disabled={!body.trim()}>
            <Send className="size-4" />
            {t('classroom.reply')}
          </Button>
        </form>
      )}
    </div>
  );
}

export function AskQuestion({
  groupId,
  assignmentId,
  onDone,
}: {
  groupId: string;
  assignmentId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = classroomQuestionSchema.parse({ title, body, isPrivate, assignmentId });
      const res = await api<{ id: string }>(`/academy/groups/${groupId}/classroom/questions`, {
        method: 'POST',
        body: data,
      });
      setOpen(false);
      setTitle('');
      setBody('');
      onDone?.();
      router.push(`/akademiya/sinif/${groupId}/sual/${res.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t('classroom.ask')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t('classroom.ask')} description={t('classroom.privateHint')}>
          <form onSubmit={save} className="cr-form">
            <Field label={t('classroom.questionTitle')}>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </Field>
            <Field label={t('classroom.questionBody')}>
              <textarea
                className="inp"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={50000}
              />
            </Field>
            <label className="cr-check">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setPrivate(e.target.checked)}
              />
              <LockKeyhole className="size-4" />
              {t('classroom.private')}
            </label>
            {error ? (
              <p role="alert" className="text-error-ink text-sm">
                {error}
              </p>
            ) : null}
            <div className="cr-form-actions">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('classroom.cancel')}
              </Button>
              <Button type="submit" loading={busy} disabled={!title.trim() || !body.trim()}>
                {t('classroom.ask')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QuestionsList({
  groupId,
  readOnly,
  assignmentId,
}: {
  groupId: string;
  readOnly: boolean;
  assignmentId?: string;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClassroomPage<ClassroomQuestionDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    api<ClassroomPage<ClassroomQuestionDto>>(
      `/academy/groups/${groupId}/classroom/questions?page=${page}${assignmentId ? `&assignmentId=${assignmentId}` : ''}`,
    )
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [groupId, page, assignmentId, retry]);
  return (
    <section className="cr-card">
      <div className="cr-section-head">
        <div>
          <h2>{t('classroom.questions')}</h2>
          <p>{t('classroom.noQuestionsHint')}</p>
        </div>
        {!readOnly ? (
          <AskQuestion
            groupId={groupId}
            assignmentId={assignmentId}
            onDone={() => setRetry((n) => n + 1)}
          />
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="cr-inline-error">
          {error}
          <Button type="button" variant="ghost" onClick={() => setRetry((n) => n + 1)}>
            {t('classroom.retry')}
          </Button>
        </div>
      ) : null}
      {!data && !error ? (
        <div className="cr-loading" role="status">
          {t('common.loading')}
        </div>
      ) : null}
      {data?.items.length === 0 ? (
        <div className="cr-empty">
          <CircleHelp aria-hidden />
          <h3>{t('classroom.noQuestions')}</h3>
          <p>{t('classroom.noQuestionsHint')}</p>
        </div>
      ) : null}
      <ul className="cr-question-list">
        {data?.items.map((q) => (
          <li key={q.id}>
            <Link href={`/akademiya/sinif/${groupId}/sual/${q.id}`}>
              <span className={`cr-list-icon ${q.resolvedAt ? 'done' : ''}`}>
                {q.resolvedAt ? <CheckCircle2 aria-hidden /> : <CircleHelp aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <b>{q.title}</b>
                <span className="cr-row-meta">
                  <span>{q.authorName}</span>
                  <span>{fmtZoned(q.createdAt)}</span>
                  {q.isPrivate ? (
                    <span>
                      <LockKeyhole className="size-3" />
                      {t('classroom.private')}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="cr-count">
                <MessageSquare className="size-4" />
                {q.replyCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {data && data.total > data.pageSize ? (
        <div className="cr-pagination">
          <Button
            type="button"
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t('classroom.previous')}
          </Button>
          <span>{t('classroom.page', { n: page })}</span>
          <Button
            type="button"
            variant="ghost"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage(page + 1)}
          >
            {t('classroom.next')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
