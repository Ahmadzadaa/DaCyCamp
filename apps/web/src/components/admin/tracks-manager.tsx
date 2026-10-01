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
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createTrackSchema, slugify, type TrackDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { TrackBadge } from '@/components/app/track-badge';
import { ConfirmDialog } from './confirm-dialog';
import { useAdmin } from './admin-context';

type Draft = { title: string; slug: string; color: string; icon: string; description: string };
const emptyDraft = (): Draft => ({
  title: '',
  slug: '',
  color: '#6C7CF0',
  icon: '',
  description: '',
});

export function TracksManager({ initial }: { initial: TrackDto[] }) {
  const { isAdmin } = useAdmin();
  const [tracks, setTracks] = useState(initial);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = tracks.findIndex((x) => x.id === active.id);
    const to = tracks.findIndex((x) => x.id === over.id);
    const before = tracks;
    const next = arrayMove(tracks, from, to);
    setTracks(next);
    try {
      await api('/admin/tracks/reorder', { method: 'PATCH', body: { ids: next.map((x) => x.id) } });
      toast.success(t('admin.reorderSaved'));
    } catch (err) {
      setTracks(before);
      toast.error(errorMessage(err));
    }
  }

  async function togglePublished(tr: TrackDto, v: boolean) {
    try {
      const u = await api<TrackDto>(`/admin/tracks/${tr.id}`, {
        method: 'PATCH',
        body: { isPublished: v },
      });
      setTracks((ts) => ts.map((x) => (x.id === tr.id ? { ...x, ...u } : x)));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body = {
      title: editing.draft.title.trim(),
      slug: editing.draft.slug.trim(),
      color: editing.draft.color.toUpperCase(),
      icon: editing.draft.icon.trim() || undefined,
      description: editing.draft.description.trim() || undefined,
    };
    const parsed = createTrackSchema.safeParse(body);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t('errors.VALIDATION_FAILED'));
      return;
    }
    try {
      if (editing.id) {
        const u = await api<TrackDto>(`/admin/tracks/${editing.id}`, {
          method: 'PATCH',
          body: parsed.data,
        });
        setTracks((ts) => ts.map((x) => (x.id === editing.id ? { ...x, ...u } : x)));
      } else {
        const c = await api<TrackDto>('/admin/tracks', { method: 'POST', body: parsed.data });
        setTracks((ts) => [...ts, c]);
      }
      toast.success(t('admin.trackSaved'));
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove() {
    if (!delId) return;
    setDelError(null);
    try {
      await api(`/admin/tracks/${delId}`, { method: 'DELETE' });
      setTracks((ts) => ts.filter((x) => x.id !== delId));
      setDelId(null);
      toast.success(t('admin.deleted'));
    } catch (err) {
      setDelError(errorMessage(err));
    }
  }

  const d = editing?.draft;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">{t('admin.tracks')}</h1>
        <Button type="button" onClick={() => setEditing({ id: null, draft: emptyDraft() })}>
          <Plus className="size-4" />
          {t('admin.newTrack')}
        </Button>
      </div>
      <div className="card overflow-hidden">
        <DndContext id="tracks-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tracks.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <ul className="m-0 list-none p-0">
              {tracks.map((tr) => (
                <TrackRow
                  key={tr.id}
                  track={tr}
                  isAdmin={isAdmin}
                  onEdit={() =>
                    setEditing({
                      id: tr.id,
                      draft: {
                        title: tr.title,
                        slug: tr.slug,
                        color: tr.color,
                        icon: tr.icon ?? '',
                        description: tr.description ?? '',
                      },
                    })
                  }
                  onDelete={() => {
                    setDelError(null);
                    setDelId(tr.id);
                  }}
                  onToggle={(v) => togglePublished(tr, v)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {tracks.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t('admin.noTracks')}</p>
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && d ? (
          <DialogContent title={editing.id ? t('admin.editTrack') : t('admin.newTrack')}>
            <form onSubmit={submitEdit} className="grid gap-3 md:grid-cols-2">
              <Field label={t('common.title')}>
                <Input
                  value={d.title}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      draft: {
                        ...d,
                        title: e.target.value,
                        slug: editing.id ? d.slug : slugify(e.target.value),
                      },
                    })
                  }
                  required
                />
              </Field>
              <Field label={t('common.slug')}>
                <Input
                  value={d.slug}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...d, slug: e.target.value } })
                  }
                  className="font-mono"
                  required
                />
              </Field>
              <Field label={t('common.color')} hint={t('admin.colorHint')}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={d.color}
                    onChange={(e) =>
                      setEditing({ ...editing, draft: { ...d, color: e.target.value } })
                    }
                    className="h-9 w-12 cursor-pointer rounded border border-line bg-card"
                    aria-label={t('common.color')}
                  />
                  <Input
                    value={d.color}
                    onChange={(e) =>
                      setEditing({ ...editing, draft: { ...d, color: e.target.value } })
                    }
                    className="font-mono"
                  />
                </div>
              </Field>
              <Field label={t('common.icon')} hint="bar-chart-3 · workflow · shield · …">
                <Input
                  value={d.icon}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...d, icon: e.target.value } })
                  }
                />
              </Field>
              <Field label={t('common.description')} full>
                <Textarea
                  value={d.description}
                  onChange={(e) =>
                    setEditing({ ...editing, draft: { ...d, description: e.target.value } })
                  }
                  rows={2}
                />
              </Field>
              <div className="md:col-span-2">
                <TrackBadge color={/^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color : '#6C7CF0'}>
                  {d.title || t('common.track')}
                </TrackBadge>
              </div>
              <div className="flex justify-end gap-2 md:col-span-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    {t('common.cancel')}
                  </Button>
                </DialogClose>
                <Button type="submit">{t('common.save')}</Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title={t('common.deleteConfirm')}
        onConfirm={remove}
        error={delError}
      />
    </div>
  );
}

function TrackRow({
  track: tr,
  isAdmin,
  onEdit,
  onDelete,
  onToggle,
}: {
  track: TrackDto;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tr.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined,
      }}
      className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="cursor-grab border-0 bg-transparent text-muted"
        aria-label={t('admin.dragHandle')}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span
        className="size-5 rounded-md border border-line"
        style={{ background: tr.color }}
        aria-hidden
      />
      <TrackBadge color={tr.color}>{tr.title}</TrackBadge>
      <span className="font-mono text-xs text-muted">{tr.slug}</span>
      <span className="text-xs text-muted">
        {t('common.modules', { n: 0 }).replace('0 fəsil', `${tr.courseCount ?? 0} kurs`)}
      </span>
      <span className="flex-1" />
      <label className="flex items-center gap-2 text-xs text-muted">
        <Switch
          checked={tr.isPublished}
          onCheckedChange={onToggle}
          aria-label={t('common.published')}
        />
        {tr.isPublished ? t('common.published') : t('common.draft')}
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        aria-label={t('common.edit')}
      >
        <Pencil className="size-4" />
      </Button>
      {isAdmin ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onDelete}
          aria-label={t('common.delete')}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}
