'use client';
import { ZodError } from 'zod';
import { useState } from 'react';
import { useEditorDraft, DraftStatus } from './use-editor-draft';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, X, Search, BookOpen } from 'lucide-react';
import {
  classroomTopicSchema,
  classroomLessonSchema,
  classroomAnnouncementSchema,
  type ClassroomLink,
  type ClassroomLessonDto,
  type ClassroomTopicDto,
  type ClassroomAnnouncementDto,
  type AcademyStepRefDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/app/markdown';
import { fromLocalInput, toLocalInput } from '@/components/academy/format';

const formError = (e: unknown) =>
  e instanceof ZodError ? (e.issues[0]?.message ?? errorMessage(e)) : errorMessage(e);

export function LinkFields({
  links,
  onChange,
}: {
  links: ClassroomLink[];
  onChange: (links: ClassroomLink[]) => void;
}) {
  return (
    <fieldset className="cr-link-fields">
      <legend className="lbl">{t('classroom.links')}</legend>
      {links.map((link, i) => (
        <div className="cr-link-row" key={i}>
          <Input
            aria-label={`${t('classroom.linkLabel')} ${i + 1}`}
            placeholder={t('classroom.linkLabel')}
            value={link.label}
            onChange={(e) =>
              onChange(links.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))
            }
            required
            maxLength={200}
          />
          <Input
            aria-label={`${t('classroom.links')} ${i + 1}`}
            type="url"
            placeholder="https://…"
            value={link.url}
            onChange={(e) =>
              onChange(links.map((x, n) => (n === i ? { ...x, url: e.target.value } : x)))
            }
            required
          />
          <button
            type="button"
            className="iconbtn"
            aria-label={t('classroom.removeLink')}
            onClick={() => onChange(links.filter((_, n) => n !== i))}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={links.length >= 20}
        onClick={() => onChange([...links, { label: '', url: '' }])}
      >
        <Plus className="size-4" />
        {t('classroom.addLink')}
      </Button>
    </fieldset>
  );
}

function Publishing({
  published,
  setPublished,
  publishAt,
  setPublishAt,
}: {
  published: boolean;
  setPublished: (v: boolean) => void;
  publishAt: string;
  setPublishAt: (v: string) => void;
}) {
  return (
    <div className="cr-publishing">
      <label className="cr-check">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        {t('classroom.publish')}
      </label>
      {published ? (
        <Field label={t('classroom.publishAt')} hint={t('classroom.scheduleHint')}>
          <Input
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function TopicEditor({
  groupId,
  viewerId,
  initial,
  count = 0,
}: {
  groupId: string;
  viewerId: string;
  initial?: ClassroomTopicDto;
  count?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [order, setOrder] = useState(initial?.order ?? count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useEditorDraft(
    `dacy:editor:${viewerId}:topic:${groupId}:${initial?.id ?? 'new'}`,
    open,
    { title, description, order },
    initial ? JSON.stringify([initial.title, initial.description, initial.order]) : undefined,
  );
  function apply(values: { title: string; description: string; order: number }) {
    setTitle(values.title);
    setDescription(values.description);
    setOrder(values.order);
  }
  function begin() {
    apply(
      draft.begin({
        title: initial?.title ?? '',
        description: initial?.description ?? '',
        order: initial?.order ?? count,
      }),
    );
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = classroomTopicSchema.parse({ title, description, order });
      await api(`/academy/groups/${groupId}/classroom/topics${initial ? `/${initial.id}` : ''}`, {
        method: initial ? 'PATCH' : 'POST',
        body,
      });
      draft.clear();
      setOpen(false);
      router.refresh();
      toast.success(t('classroom.saved'));
      if (!initial) {
        setTitle('');
        setDescription('');
      }
    } catch (e) {
      setError(formError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={begin}>
        {initial ? (
          t('classroom.editTopic')
        ) : (
          <>
            <Plus className="size-4" />
            {t('classroom.newTopic')}
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={t(initial ? 'classroom.editTopic' : 'classroom.newTopic')}
          description={t('classroom.manageHint')}
        >
          <form onSubmit={save} className="cr-form">
            <DraftStatus
              draft={draft}
              onRestore={() => {
                const saved = draft.recover();
                if (saved) apply(saved);
              }}
            />
            <Field label={t('classroom.titleLabel')}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                autoFocus
              />
            </Field>
            <Field label={t('classroom.description')}>
              <textarea
                className="inp"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </Field>
            <Field label={t('classroom.order')}>
              <Input
                type="number"
                min={0}
                max={10000}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                required
              />
            </Field>
            {error ? (
              <p role="alert" className="text-error-ink text-sm">
                {error}
              </p>
            ) : null}
            <div className="cr-form-actions">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('classroom.cancel')}
              </Button>
              <Button type="submit" loading={busy} disabled={!!draft.stale}>
                {t('classroom.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AnnouncementEditor({
  groupId,
  viewerId,
  initial,
}: {
  groupId: string;
  viewerId: string;
  initial?: ClassroomAnnouncementDto;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [links, setLinks] = useState<ClassroomLink[]>(initial?.links ?? []);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [commentsEnabled, setCommentsEnabled] = useState(initial?.commentsEnabled ?? true);
  const [published, setPublished] = useState(initial?.isPublished ?? true);
  const [publishAt, setPublishAt] = useState(initial ? toLocalInput(initial.publishAt) : '');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useEditorDraft(
    `dacy:editor:${viewerId}:post:${groupId}:${initial?.id ?? 'new'}`,
    open,
    { title, body, links, pinned, commentsEnabled, published, publishAt },
    initial?.version,
  );
  function apply(values: {
    title: string;
    body: string;
    links: ClassroomLink[];
    pinned: boolean;
    commentsEnabled: boolean;
    published: boolean;
    publishAt: string;
  }) {
    setTitle(values.title);
    setBody(values.body);
    setLinks(values.links);
    setPinned(values.pinned);
    setCommentsEnabled(values.commentsEnabled);
    setPublished(values.published);
    setPublishAt(values.publishAt);
  }
  function begin() {
    apply(
      draft.begin({
        title: initial?.title ?? '',
        body: initial?.body ?? '',
        links: initial?.links ?? [],
        pinned: initial?.pinned ?? false,
        commentsEnabled: initial?.commentsEnabled ?? true,
        published: initial?.isPublished ?? true,
        publishAt: initial ? toLocalInput(initial.publishAt) : '',
      }),
    );
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = classroomAnnouncementSchema.parse({
        title,
        body,
        links,
        pinned,
        commentsEnabled,
        isPublished: published,
        publishAt: fromLocalInput(publishAt) ?? undefined,
      });
      await api(
        initial
          ? `/academy/classroom/announcements/${initial.id}`
          : `/academy/groups/${groupId}/classroom/announcements`,
        {
          method: initial ? 'PATCH' : 'POST',
          body: { ...data, ...(initial ? { expectedVersion: draft.baseVersion } : {}) },
        },
      );
      draft.clear();
      setOpen(false);
      router.refresh();
      toast.success(t('classroom.saved'));
      if (!initial) {
        setTitle('');
        setBody('');
        setLinks([]);
        setPinned(false);
      }
    } catch (e) {
      setError(formError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button type="button" variant={initial ? 'ghost' : 'brand'} size="sm" onClick={begin}>
        {initial ? (
          t('classroom.edit')
        ) : (
          <>
            <Plus className="size-4" />
            {t('classroom.newAnnouncement')}
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cr-editor-dialog"
          title={t(initial ? 'classroom.editAnnouncement' : 'classroom.newAnnouncement')}
          description={t('classroom.manageHint')}
        >
          <form onSubmit={save} className="cr-form">
            <DraftStatus
              draft={draft}
              onRestore={() => {
                const saved = draft.recover();
                if (saved) apply(saved);
              }}
            />
            <Field label={t('classroom.titleLabel')}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
                maxLength={200}
              />
            </Field>
            <div className="cr-field-head">
              <label className="lbl" htmlFor="announcement-body">
                {t('classroom.content')}
              </label>
              <button type="button" className="chip" onClick={() => setPreview(!preview)}>
                {t(preview ? 'classroom.source' : 'classroom.preview')}
              </button>
            </div>
            {preview ? (
              <div className="cr-preview">
                <Markdown content={body} />
              </div>
            ) : (
              <textarea
                id="announcement-body"
                className="inp cr-content-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={50000}
                rows={7}
              />
            )}
            <LinkFields links={links} onChange={setLinks} />
            <div className="flex flex-wrap gap-5">
              <label className="cr-check">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
                {t('classroom.pin')}
              </label>
              <label className="cr-check">
                <input
                  type="checkbox"
                  checked={commentsEnabled}
                  onChange={(e) => setCommentsEnabled(e.target.checked)}
                />
                {t('classroom.commentsEnabled')}
              </label>
            </div>
            <Publishing
              published={published}
              setPublished={setPublished}
              publishAt={publishAt}
              setPublishAt={setPublishAt}
            />
            {error ? (
              <p role="alert" className="text-sm text-error-ink">
                {error}
              </p>
            ) : null}
            <div className="cr-form-actions">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('classroom.cancel')}
              </Button>
              <Button type="submit" loading={busy} disabled={!title.trim() || !body.trim()}>
                {t('classroom.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LessonEditor({
  groupId,
  viewerId,
  topics,
  initial,
  topicId,
}: {
  groupId: string;
  viewerId: string;
  topics: ClassroomTopicDto[];
  initial?: ClassroomLessonDto;
  topicId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [topic, setTopic] = useState(initial?.topicId ?? topicId ?? '');
  const [order, setOrder] = useState(
    initial?.order ?? topics.find((t) => t.id === topicId)?.lessons.length ?? 0,
  );
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '');
  const [links, setLinks] = useState<ClassroomLink[]>(initial?.links ?? []);
  const [stepIds, setStepIds] = useState<string[]>(initial?.stepIds ?? []);
  const [stepTitles, setStepTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.steps ?? []).map((s) => [s.id, s.title])),
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AcademyStepRefDto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [published, setPublished] = useState(initial?.isPublished ?? false);
  const [publishAt, setPublishAt] = useState(initial ? toLocalInput(initial.publishAt) : '');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function search() {
    setSearching(true);
    try {
      setResults(await api(`/academy/steps/search?limit=10&q=${encodeURIComponent(query)}`));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSearching(false);
    }
  }

  const draft = useEditorDraft(
    `dacy:editor:${viewerId}:lesson:${groupId}:${initial?.id ?? topicId ?? 'new'}`,
    open,
    { title, content, topic, order, videoUrl, links, stepIds, stepTitles, published, publishAt },
    initial?.version,
  );
  function apply(values: {
    title: string;
    content: string;
    topic: string;
    order: number;
    videoUrl: string;
    links: ClassroomLink[];
    stepIds: string[];
    stepTitles: Record<string, string>;
    published: boolean;
    publishAt: string;
  }) {
    setTitle(values.title);
    setContent(values.content);
    setTopic(values.topic);
    setOrder(values.order);
    setVideoUrl(values.videoUrl);
    setLinks(values.links);
    setStepIds(values.stepIds);
    setStepTitles(values.stepTitles);
    setPublished(values.published);
    setPublishAt(values.publishAt);
  }
  function begin() {
    apply(
      draft.begin({
        title: initial?.title ?? '',
        content: initial?.content ?? '',
        topic: initial?.topicId ?? topicId ?? '',
        order: initial?.order ?? topics.find((t) => t.id === topicId)?.lessons.length ?? 0,
        videoUrl: initial?.videoUrl ?? '',
        links: initial?.links ?? [],
        stepIds: initial?.stepIds ?? [],
        stepTitles: Object.fromEntries((initial?.steps ?? []).map((s) => [s.id, s.title])),
        published: initial?.isPublished ?? false,
        publishAt: initial ? toLocalInput(initial.publishAt) : '',
      }),
    );
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = classroomLessonSchema.parse({
        title,
        content,
        topicId: topic,
        order,
        videoUrl: videoUrl.trim() || null,
        links,
        stepIds,
        isPublished: published,
        publishAt: fromLocalInput(publishAt) ?? undefined,
      });
      const lesson = await api<ClassroomLessonDto>(
        initial
          ? `/academy/classroom/lessons/${initial.id}`
          : `/academy/groups/${groupId}/classroom/lessons`,
        {
          method: initial ? 'PATCH' : 'POST',
          body: { ...data, ...(initial ? { expectedVersion: draft.baseVersion } : {}) },
        },
      );
      draft.clear();
      setOpen(false);
      toast.success(t('classroom.saved'));
      if (!initial) router.push(`/akademiya/sinif/${groupId}/ders/${lesson.id}`);
      else router.refresh();
    } catch (e) {
      setError(formError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={begin}>
        {initial ? (
          t('classroom.editLesson')
        ) : (
          <>
            <Plus className="size-4" />
            {t('classroom.newLesson')}
          </>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cr-editor-dialog"
          title={t(initial ? 'classroom.editLesson' : 'classroom.newLesson')}
          description={t('classroom.manageHint')}
        >
          <form onSubmit={save} className="cr-form">
            <DraftStatus
              draft={draft}
              onRestore={() => {
                const saved = draft.recover();
                if (saved) apply(saved);
              }}
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <Field label={t('classroom.topic')}>
                <select
                  className="inp"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                >
                  <option value="">{t('classroom.selectTopic')}</option>
                  {topics
                    .filter((t) => !t.archivedAt)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t('classroom.order')}>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  required
                />
              </Field>
            </div>
            <Field label={t('classroom.titleLabel')}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </Field>
            <div className="cr-field-head">
              <label className="lbl" htmlFor="lesson-content">
                {t('classroom.content')}
              </label>
              <button type="button" className="chip" onClick={() => setPreview(!preview)}>
                {t(preview ? 'classroom.source' : 'classroom.preview')}
              </button>
            </div>
            {preview ? (
              <div className="cr-preview">
                <Markdown content={content} />
              </div>
            ) : (
              <textarea
                id="lesson-content"
                className="inp cr-content-input"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={50000}
              />
            )}
            <p className="text-xs text-muted">{t('classroom.markdownHint')}</p>
            <Field label={t('classroom.video')}>
              <Input
                type="url"
                placeholder="https://…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </Field>
            <LinkFields links={links} onChange={setLinks} />
            <fieldset className="cr-practice-picker">
              <legend className="lbl">{t('classroom.practices')}</legend>
              <div className="flex gap-2">
                <Input
                  aria-label={t('classroom.searchSteps')}
                  placeholder={t('classroom.searchSteps')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void search();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  loading={searching}
                  onClick={() => void search()}
                  aria-label={t('classroom.search')}
                >
                  <Search className="size-4" />
                </Button>
              </div>
              {results?.length === 0 ? (
                <p className="text-sm text-muted">{t('classroom.noResults')}</p>
              ) : null}
              {results ? (
                <ul className="cr-search-results">
                  {results
                    .filter((s) => !stepIds.includes(s.stepId))
                    .map((s) => (
                      <li key={s.stepId}>
                        <button
                          type="button"
                          disabled={stepIds.length >= 20}
                          onClick={() => {
                            setStepIds([...stepIds, s.stepId]);
                            setStepTitles({ ...stepTitles, [s.stepId]: s.title });
                          }}
                        >
                          <span>
                            <b>{s.title}</b>
                            <small>
                              {s.courseTitle} · {s.type}
                            </small>
                          </span>
                          <Plus className="size-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              ) : null}
              {stepIds.map((id) => (
                <div className="cr-picked-step" key={id}>
                  <BookOpen className="size-4" />
                  <span>{stepTitles[id] ?? id}</span>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label={`${t('classroom.removeLink')}: ${stepTitles[id] ?? id}`}
                    onClick={() => setStepIds(stepIds.filter((s) => s !== id))}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </fieldset>
            <Publishing
              published={published}
              setPublished={setPublished}
              publishAt={publishAt}
              setPublishAt={setPublishAt}
            />
            {error ? (
              <p role="alert" className="text-sm text-error-ink">
                {error}
              </p>
            ) : null}
            <div className="cr-form-actions">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('classroom.cancel')}
              </Button>
              <Button type="submit" loading={busy} disabled={!!draft.stale}>
                {t('classroom.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
