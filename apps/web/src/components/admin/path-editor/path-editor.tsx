'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { Download, Eye, GripVertical, Plus, Trash2 } from 'lucide-react';
import type {
  AdminCourseDto,
  AdminPathDto,
  AdminPathItemDto,
  PathItemInput,
  TrackDto,
} from '@dacy/shared';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { TrackBadge } from '@/components/app/track-badge';
import { IssuesBox } from '../course-editor/issues-box';
import { StatusBadge } from '../status-badge';
import { PathForm } from './path-form';
import { PathItemForm } from './path-item-form';

const TYPE_LABEL = {
  COURSE: () => t('paths.itemCourse'),
  PROJECT: () => t('paths.itemProject'),
  ASSESSMENT: () => t('paths.itemAssessment'),
  MILESTONE: () => t('paths.itemMilestone'),
} as const;

function SortableRow({
  item,
  selected,
  onSelect,
}: {
  item: AdminPathItemDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-line bg-card px-2 py-2 text-sm',
        selected && 'border-brand ring-1 ring-brand',
        isDragging && 'opacity-60',
      )}
      data-testid="path-item-row"
    >
      <button
        type="button"
        className="cursor-grab text-muted"
        aria-label={t('admin.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={onSelect}
      >
        <span className="ntype shrink-0">{TYPE_LABEL[item.type]()}</span>
        <span className="truncate font-medium">{item.title || t('common.untitled')}</span>
        {item.isOptional ? (
          <span className="shrink-0 text-xs text-muted">· {t('paths.optional')}</span>
        ) : null}
        {item.course && !item.course.isPublished ? (
          <span className="shrink-0 text-xs text-de">· qaralama</span>
        ) : null}
      </button>
    </li>
  );
}

/** Yol redaktoru: solda addımlar (sürüklə-sırala), sağda yol ayarları və ya seçilmiş addımın forması */
export function PathEditor({
  initial,
  tracks,
  courses,
}: {
  initial: AdminPathDto;
  tracks: TrackDto[];
  courses: AdminCourseDto[];
}) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<PathItemInput['type']>('course');
  const [newCourse, setNewCourse] = useState(courses[0]?.slug ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selected = p.items.find((i) => i.id === sel) ?? null;

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = p.items.findIndex((x) => x.id === active.id);
    const to = p.items.findIndex((x) => x.id === over.id);
    const next = arrayMove(p.items, from, to);
    const before = p;
    setP({ ...p, items: next });
    try {
      setP(
        await api<AdminPathDto>(`/admin/paths/${p.id}/items/order`, {
          method: 'PUT',
          body: { ids: next.map((x) => x.id) },
        }),
      );
      toast.success(t('admin.reorderSaved'));
    } catch (err) {
      setP(before);
      toast.error(errorMessage(err));
    }
  }

  async function addItem() {
    const body: PathItemInput =
      newType === 'course'
        ? { type: 'course', course_slug: newCourse, optional: false, xp: 0 }
        : newType === 'project'
          ? {
              type: 'project',
              title: newTitle,
              optional: false,
              xp: 100,
              config: {
                instructions: '',
                deliverables: [],
                review_mode: 'manual',
                allow_link: true,
                max_files: 5,
              },
            }
          : newType === 'assessment'
            ? {
                type: 'assessment',
                title: newTitle,
                optional: false,
                xp: 50,
                config: { pass_score: 70, questions: [] },
              }
            : {
                type: 'milestone',
                title: newTitle,
                optional: false,
                xp: 0,
                config: { certificate_title: '', description: '' },
              };
    setBusy('add');
    try {
      const u = await api<AdminPathDto>(`/admin/paths/${p.id}/items`, { method: 'POST', body });
      setP(u);
      setSel(u.items[u.items.length - 1]?.id ?? null);
      setAdding(false);
      setNewTitle('');
      toast.success(t('admin.itemSaved'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function togglePublish() {
    setBusy('publish');
    try {
      setP(
        await api<AdminPathDto>(`/admin/paths/${p.id}/publish`, {
          method: 'POST',
          body: { published: !p.isPublished },
        }),
      );
      toast.success(p.isPublished ? t('common.unpublished') : t('common.published'));
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PUBLISH_ISSUES') {
        setP({ ...p, issues: (e.details as AdminPathDto['issues']) ?? p.issues });
        toast.error(errorMessage(e));
      } else toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function removePath() {
    if (!window.confirm(t('admin.deletePathConfirm'))) return;
    setBusy('delete');
    try {
      await api(`/admin/paths/${p.id}`, { method: 'DELETE' });
      toast.success(t('admin.pathDeleted'));
      router.push('/admin/yollar');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PATH_HAS_ENROLLMENTS') {
        if (window.confirm(`${errorMessage(e)}. ${t('admin.deletePathConfirm')}`)) {
          await api(`/admin/paths/${p.id}?force=1`, { method: 'DELETE' });
          router.push('/admin/yollar');
          return;
        }
      } else toast.error(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <aside className="flex flex-col gap-3">
        <div className="box">
          <div className="flex items-center gap-2">
            <TrackBadge color={p.track.color}>{p.track.title}</TrackBadge>
            <StatusBadge published={p.isPublished} />
          </div>
          <h2 className="mt-2 text-lg">{p.title}</h2>
          <p className="mt-1 text-xs text-muted">
            {p.itemCount} {t('admin.pathSteps').toLowerCase()} ·{' '}
            {t('admin.enrollmentCount', { n: p.enrollmentCount })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={p.isPublished ? 'dark' : 'brand'}
              loading={busy === 'publish'}
              onClick={() => void togglePublish()}
              data-testid="path-publish"
            >
              {p.isPublished ? t('common.unpublish') : t('common.publish')}
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/yol/${p.slug}?onizle=1`} target="_blank">
                <Eye className="size-4" /> {t('common.previewAsStudent')}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href={`/api/admin/paths/${p.id}/export.yaml`} download>
                <Download className="size-4" /> {t('admin.exportYaml')}
              </a>
            </Button>
          </div>
        </div>
        {p.issues.length ? <IssuesBox title={t('admin.publishIssues')} issues={p.issues} /> : null}
        <div className="box">
          <div className="mb-2 flex items-center justify-between">
            <b>{t('admin.pathSteps')}</b>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(true)}
              data-testid="path-add-item"
            >
              <Plus className="size-4" /> {t('admin.addItem')}
            </Button>
          </div>
          {p.items.length === 0 ? (
            <p className="text-sm text-muted">{t('admin.pathNoItems')}</p>
          ) : (
            <DndContext
              id="path-items-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={p.items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-1.5">
                  {p.items.map((it) => (
                    <SortableRow
                      key={it.id}
                      item={it}
                      selected={sel === it.id}
                      onSelect={() => setSel(it.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start"
          loading={busy === 'delete'}
          onClick={() => void removePath()}
        >
          <Trash2 className="size-4" /> {t('admin.deletePath')}
        </Button>
      </aside>

      <section className="box">
        {selected ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <span className="ntype">{TYPE_LABEL[selected.type]()}</span>
              <h2 className="text-lg">{selected.title || t('common.untitled')}</h2>
              <button
                type="button"
                className="ml-auto text-xs text-muted hover:underline"
                onClick={() => setSel(null)}
              >
                {t('admin.pathsTitle')} →
              </button>
            </div>
            <PathItemForm
              key={selected.id}
              item={selected}
              courses={courses}
              onSaved={setP}
              onDeleted={(u) => {
                setP(u);
                setSel(null);
              }}
            />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-lg">{t('common.settings')}</h2>
            <PathForm path={p} tracks={tracks} onSaved={(u) => setP({ ...p, ...u })} />
          </>
        )}
      </section>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent title={t('admin.addItem')}>
          <div className="flex flex-col gap-3">
            <Field label={t('admin.itemType')}>
              <Select
                value={newType}
                onChange={(e) => setNewType(e.target.value as PathItemInput['type'])}
                data-testid="new-item-type"
              >
                <option value="course">{t('paths.itemCourse')}</option>
                <option value="assessment">{t('paths.itemAssessment')}</option>
                <option value="project">{t('paths.itemProject')}</option>
                <option value="milestone">{t('paths.itemMilestone')}</option>
              </Select>
            </Field>
            {newType === 'course' ? (
              <Field label={t('admin.pickCourse')} hint={t('admin.selectPathCourse')}>
                {courses.length ? (
                  <Select
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    data-testid="new-item-course"
                  >
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title} {c.isPublished ? '' : '(qaralama)'}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-sm text-muted">{t('admin.noPublishedCourses')}</p>
                )}
              </Field>
            ) : (
              <Field label={t('common.title')}>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  data-testid="new-item-title"
                />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                loading={busy === 'add'}
                disabled={newType === 'course' ? !newCourse : !newTitle.trim()}
                onClick={() => void addItem()}
                data-testid="new-item-add"
              >
                {t('common.add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
