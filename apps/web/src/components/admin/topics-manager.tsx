'use client';
import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { GripVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { createTopicSchema, slugify, type TopicDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/app/empty-state';
import { ConfirmDialog } from './confirm-dialog';
import { EnFields, enDraftOf, enPayload, type EnDraft } from './en-fields';
import { PageHeader } from './page-header';

type Draft = { title: string; slug: string; color: string; description: string; en: EnDraft };
const emptyDraft = (): Draft => ({
  title: '',
  slug: '',
  color: '#6C7CF0',
  description: '',
  en: enDraftOf(null),
});
const SWATCHES = [
  '#6C7CF0',
  '#F0A93E',
  '#F06A8D',
  '#2BD4A4',
  '#4B5BD0',
  '#B87610',
  '#159B74',
  '#5E6A82',
];

/** Mövzular (Qeyd 5): yarat, redaktə et, gizlət, sürüklə-sırala, sil */
export function TopicsManager({ initial }: { initial: TopicDto[] }) {
  const [topics, setTopics] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [del, setDel] = useState<TopicDto | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const before = topics;
    const next = arrayMove(
      topics,
      topics.findIndex((x) => x.id === active.id),
      topics.findIndex((x) => x.id === over.id),
    );
    setTopics(next);
    try {
      await api('/admin/topics/reorder', { method: 'PATCH', body: { ids: next.map((x) => x.id) } });
      toast.success(t('admin.reorderSaved'));
    } catch (err) {
      setTopics(before);
      toast.error(errorMessage(err));
    }
  }

  async function togglePublished(tp: TopicDto, v: boolean) {
    try {
      const u = await api<TopicDto>(`/admin/topics/${tp.id}`, {
        method: 'PATCH',
        body: { isPublished: v },
      });
      setTopics((ts) => ts.map((x) => (x.id === tp.id ? { ...x, ...u } : x)));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const parsed = createTopicSchema.safeParse({
      title: editing.draft.title.trim(),
      slug: editing.draft.slug.trim(),
      color: editing.draft.color.toUpperCase(),
      description: editing.draft.description.trim() || null,
      en: enPayload(editing.draft.en),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t('errors.VALIDATION_FAILED'));
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const u = await api<TopicDto>(`/admin/topics/${editing.id}`, {
          method: 'PATCH',
          body: parsed.data,
        });
        setTopics((ts) => ts.map((x) => (x.id === editing.id ? { ...x, ...u } : x)));
        toast.success(t('topics.saved'));
      } else {
        const c = await api<TopicDto>('/admin/topics', { method: 'POST', body: parsed.data });
        setTopics((ts) => [...ts, c]);
        toast.success(t('topics.created'));
      }
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!del) return;
    setDelError(null);
    try {
      await api(`/admin/topics/${del.id}`, { method: 'DELETE' });
      setTopics((ts) => ts.filter((x) => x.id !== del.id));
      setDel(null);
      toast.success(t('topics.deleted'));
    } catch (err) {
      setDelError(errorMessage(err));
    }
  }

  const d = editing?.draft;
  const set = (patch: Partial<Draft>) =>
    editing && setEditing({ ...editing, draft: { ...editing.draft, ...patch } });

  return (
    <div className="flex flex-col">
      <PageHeader title={t('topics.title')} subtitle={t('topics.subtitle')}>
        <Button type="button" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>
          <Plus aria-hidden />
          {t('topics.new')}
        </Button>
      </PageHeader>

      {topics.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('topics.empty')}
          description={t('topics.emptyHint')}
          action={
            <Button type="button" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>
              <Plus aria-hidden />
              {t('topics.new')}
            </Button>
          }
        />
      ) : (
        <div className="tbl-wrap">
          <DndContext
            id="topics-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={topics.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <ul className="topic-list" data-testid="topics-list">
                {topics.map((tp) => (
                  <TopicRow
                    key={tp.id}
                    topic={tp}
                    onEdit={() =>
                      setEditing({
                        id: tp.id,
                        draft: {
                          title: tp.title,
                          slug: tp.slug,
                          color: tp.color,
                          description: tp.description ?? '',
                          en: enDraftOf(tp.en),
                        },
                      })
                    }
                    onDelete={() => {
                      setDelError(null);
                      setDel(tp);
                    }}
                    onToggle={(v) => void togglePublished(tp, v)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && d ? (
          <DialogContent title={editing.id ? t('topics.edit') : t('topics.new')}>
            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
              <Field label={t('topics.titleLabel')}>
                <Input
                  value={d.title}
                  onChange={(e) =>
                    set({
                      title: e.target.value,
                      slug: editing.id ? d.slug : slugify(e.target.value),
                    })
                  }
                  required
                  maxLength={120}
                />
              </Field>
              <Field label={t('topics.slugLabel')}>
                <Input
                  value={d.slug}
                  onChange={(e) => set({ slug: e.target.value })}
                  className="font-mono"
                  required
                />
              </Field>
              <Field label={t('topics.color')} full>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="swatch"
                      style={{ background: c }}
                      aria-label={c}
                      aria-pressed={d.color.toUpperCase() === c}
                      onClick={() => set({ color: c })}
                    />
                  ))}
                  <input
                    type="color"
                    value={d.color}
                    onChange={(e) => set({ color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-card"
                    aria-label={t('topics.color')}
                  />
                </div>
              </Field>
              <Field label={t('topics.description')} full>
                <Textarea
                  value={d.description}
                  onChange={(e) => set({ description: e.target.value })}
                  rows={2}
                  maxLength={1000}
                />
              </Field>
              <EnFields value={d.en} onChange={(en) => set({ en })} />
              <div className="flex justify-end gap-2 md:col-span-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    {t('common.cancel')}
                  </Button>
                </DialogClose>
                <Button type="submit" loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={del ? t('topics.deleteTitle', { title: del.title }) : ''}
        description={t('topics.deleteDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={remove}
        error={delError}
      />
    </div>
  );
}

function TopicRow({
  topic: tp,
  onEdit,
  onDelete,
  onToggle,
}: {
  topic: TopicDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tp.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'dragging' : undefined}
      data-testid={`topic-${tp.slug}`}
    >
      <button
        type="button"
        className="drag-h"
        aria-label={t('admin.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden />
      </button>
      <span className="topic-dot" style={{ background: tp.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <b className="block truncate">{tp.title}</b>
        <span className="text-xs text-muted">
          <span className="font-mono">{tp.slug}</span> ·{' '}
          {t('topics.courses', { n: tp.courseCount ?? 0 })}
          {tp.description ? ` · ${tp.description}` : ''}
        </span>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <Switch
          checked={tp.isPublished}
          onCheckedChange={onToggle}
          aria-label={t('topics.published')}
        />
        <span className="max-sm:hidden">
          {tp.isPublished ? t('topics.published') : t('topics.hidden')}
        </span>
      </label>
      <button
        type="button"
        className="ib bd"
        onClick={onEdit}
        aria-label={t('topics.edit')}
        title={t('topics.edit')}
      >
        <Pencil aria-hidden />
      </button>
      <button
        type="button"
        className="ib bd danger"
        onClick={onDelete}
        aria-label={t('common.delete')}
        title={t('common.delete')}
      >
        <Trash2 aria-hidden />
      </button>
    </li>
  );
}
