'use client';
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
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
import type { AdminCourseDto, AdminModuleNode, AdminStepNode } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { StepIcon } from '@/components/app/step-icon';
import type { Selection } from './types';

const MOD = 'm:';
const STEP = 's:';
const DROP = 'd:';
const strip = (prefix: string, id: UniqueIdentifier) => String(id).slice(prefix.length);
const isMod = (id: UniqueIdentifier) => String(id).startsWith(MOD);
const isStep = (id: UniqueIdentifier) => String(id).startsWith(STEP);
const isDrop = (id: UniqueIdentifier) => String(id).startsWith(DROP);
const moduleOfStep = (ms: AdminModuleNode[], stepId: string) =>
  ms.find((m) => m.steps.some((s) => s.id === stepId));

interface Props {
  course: AdminCourseDto;
  modules: AdminModuleNode[];
  setModules: Dispatch<SetStateAction<AdminModuleNode[]>>;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onAddModule: () => void;
  onAddStep: (moduleId: string) => void;
  onAddVideo: (moduleId: string) => void;
}

/** Sol panel: kurs ağacı. Fəsillər və addımlar dnd-kit ilə sürüklənir (fəsillər arası köçürmə daxil). */
export function CourseTree({
  course,
  modules,
  setModules,
  selected,
  onSelect,
  onAddModule,
  onAddStep,
  onAddVideo,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const snapshot = useRef<AdminModuleNode[] | null>(null);
  const recentlyMoved = useRef(false);
  const [dragging, setDragging] = useState<'module' | 'step' | null>(null);

  /** Fəsil sürüklənəndə yalnız fəsillər, addım sürüklənəndə yalnız addımlar/boş zonalar hədəf olur */
  const collision = useCallback<CollisionDetection>((args) => {
    const modDrag = isMod(args.active.id);
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) =>
        modDrag ? isMod(c.id) : !isMod(c.id),
      ),
    });
  }, []);

  function onDragStart(e: DragStartEvent) {
    snapshot.current = modules;
    setDragging(isMod(e.active.id) ? 'module' : 'step');
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || !isStep(active.id) || recentlyMoved.current) return;
    const stepId = strip(STEP, active.id);
    setModules((prev) => {
      const from = moduleOfStep(prev, stepId);
      if (!from) return prev;
      let to: AdminModuleNode | undefined;
      let index: number;
      if (isDrop(over.id)) {
        to = prev.find((m) => m.id === strip(DROP, over.id));
        if (!to || to.id === from.id) return prev;
        index = to.steps.length;
      } else if (isStep(over.id)) {
        const overId = strip(STEP, over.id);
        to = moduleOfStep(prev, overId);
        if (!to || to.id === from.id) return prev;
        const overIndex = to.steps.findIndex((s) => s.id === overId);
        const translated = active.rect.current.translated;
        const below = !!translated && translated.top > over.rect.top + over.rect.height;
        index = overIndex + (below ? 1 : 0);
      } else {
        return prev;
      }
      const step = from.steps.find((s) => s.id === stepId)!;
      const target = to;
      recentlyMoved.current = true;
      requestAnimationFrame(() => (recentlyMoved.current = false));
      return prev.map((m) => {
        if (m.id === from.id) return { ...m, steps: m.steps.filter((s) => s.id !== stepId) };
        if (m.id === target.id)
          return { ...m, steps: [...m.steps.slice(0, index), step, ...m.steps.slice(index)] };
        return m;
      });
    });
  }

  async function persist(
    next: AdminModuleNode[],
    before: AdminModuleNode[],
    call: () => Promise<unknown>,
  ) {
    setModules(next);
    try {
      await call();
      toast.success(t('admin.reorderSaved'));
    } catch (err) {
      setModules(before);
      toast.error(errorMessage(err));
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setDragging(null);
    const before = snapshot.current;
    snapshot.current = null;
    if (!before) return;

    if (isMod(active.id)) {
      if (!over || over.id === active.id) return;
      const from = modules.findIndex((m) => m.id === strip(MOD, active.id));
      const to = modules.findIndex((m) => m.id === strip(MOD, over.id));
      if (from < 0 || to < 0) return;
      const next = arrayMove(modules, from, to);
      await persist(next, before, () =>
        api(`/admin/courses/${course.id}/modules/reorder`, {
          method: 'PATCH',
          body: { ids: next.map((m) => m.id) },
        }),
      );
      return;
    }

    const stepId = strip(STEP, active.id);
    const orig = moduleOfStep(before, stepId);
    const cur = moduleOfStep(modules, stepId);
    if (!orig || !cur) return;
    let next = modules;
    if (over && isStep(over.id)) {
      const overId = strip(STEP, over.id);
      const overModule = moduleOfStep(modules, overId);
      if (overModule && overModule.id === cur.id) {
        const from = cur.steps.findIndex((s) => s.id === stepId);
        const to = cur.steps.findIndex((s) => s.id === overId);
        if (from !== to)
          next = modules.map((m) =>
            m.id === cur.id ? { ...m, steps: arrayMove(m.steps, from, to) } : m,
          );
      }
    }
    const finalModule = moduleOfStep(next, stepId)!;
    const index = finalModule.steps.findIndex((s) => s.id === stepId);
    const moved = finalModule.id !== orig.id;
    const reordered = !moved && orig.steps.findIndex((s) => s.id === stepId) !== index;
    if (!moved && !reordered) {
      if (next !== modules) setModules(next);
      return;
    }
    await persist(next, before, () =>
      moved
        ? api(`/admin/steps/${stepId}/move`, {
            method: 'PATCH',
            body: { moduleId: finalModule.id, index },
          })
        : api(`/admin/modules/${finalModule.id}/steps/reorder`, {
            method: 'PATCH',
            body: { ids: finalModule.steps.map((s) => s.id) },
          }),
    );
  }

  function onDragCancel() {
    if (snapshot.current) setModules(snapshot.current);
    snapshot.current = null;
    setDragging(null);
  }

  const courseSelected = selected.kind === 'course';
  return (
    <aside
      className="tree md:border-b-0 border-b border-line"
      style={{ ['--c' as string]: course.track.color }}
      aria-label={t('admin.courseTree')}
    >
      <h4 className="m-0 mb-2.5">
        <button
          type="button"
          onClick={() => onSelect({ kind: 'course' })}
          className={cn(
            'tree-item w-full border-0 bg-transparent p-2 text-left font-bold text-inherit',
            courseSelected && 'sel',
          )}
          aria-current={courseSelected ? 'true' : undefined}
        >
          <span className="lbl">{course.title}</span>
        </button>
      </h4>
      <DndContext
        id="course-tree-dnd"
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <SortableContext
          items={modules.map((m) => MOD + m.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {modules.map((m, i) => (
              <ModuleItem
                key={m.id}
                module={m}
                index={i}
                selected={selected}
                onSelect={onSelect}
                onAddStep={onAddStep}
                onAddVideo={onAddVideo}
                dragging={dragging}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {modules.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted">{t('admin.noModules')}</p>
      ) : null}
      <button
        type="button"
        onClick={onAddModule}
        className="tree-item mt-2 w-full border-0 bg-transparent p-2 text-left text-muted"
      >
        {t('admin.addModule')}
      </button>
    </aside>
  );
}

function ModuleItem({
  module: m,
  index,
  selected,
  onSelect,
  onAddStep,
  onAddVideo,
  dragging,
}: {
  module: AdminModuleNode;
  index: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onAddStep: (moduleId: string) => void;
  onAddVideo: (moduleId: string) => void;
  dragging: 'module' | 'step' | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: MOD + m.id });
  const sel = selected.kind === 'module' && selected.id === m.id;
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <div className={cn('tree-item', sel && 'sel', !m.isPublished && 'unpub')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag border-0 bg-transparent p-0 text-muted"
          aria-label={`${t('admin.dragHandle')}: ${m.title}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: 'module', id: m.id })}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-[inherit] text-inherit"
          aria-current={sel ? 'true' : undefined}
        >
          <span className="lbl">
            {index + 1}. {m.title}
          </span>
          <span
            className={cn(
              'ml-auto size-2 shrink-0 rounded-full',
              m.isPublished ? 'bg-ok' : 'border border-muted',
            )}
            title={m.isPublished ? t('common.published') : t('common.draft')}
            aria-label={m.isPublished ? t('common.published') : t('common.draft')}
            role="img"
          />
        </button>
      </div>
      <SortableContext
        items={m.steps.map((s) => STEP + s.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="m-0 list-none p-0">
          {m.steps.map((s) => (
            <StepItem key={s.id} step={s} selected={selected} onSelect={onSelect} />
          ))}
          <StepDropZone
            moduleId={m.id}
            onAddStep={onAddStep}
            onAddVideo={onAddVideo}
            active={dragging === 'step'}
          />
        </ul>
      </SortableContext>
    </li>
  );
}

function StepItem({
  step,
  selected,
  onSelect,
}: {
  step: AdminStepNode;
  selected: Selection;
  onSelect: (s: Selection) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: STEP + step.id });
  const sel = selected.kind === 'step' && selected.id === step.id;
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
      }}
    >
      <div className={cn('tree-item sub', sel && 'sel', !step.isPublished && 'unpub')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag border-0 bg-transparent p-0 text-muted"
          aria-label={`${t('admin.dragHandle')}: ${step.title}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: 'step', id: step.id })}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left font-[inherit] text-inherit"
          aria-current={sel ? 'true' : undefined}
          title={`${t(`stepType.${step.type}`)} · ${step.xp} XP${step.isPublished ? '' : ` · ${t('common.draft')}`}`}
        >
          <StepIcon type={step.type} />
          <span className="lbl">{step.title}</span>
        </button>
      </div>
    </li>
  );
}

/** Fəslin sonundakı "+ Addım" sətri — eyni zamanda başqa fəsildən addım atmaq üçün zona */
function StepDropZone({
  moduleId,
  onAddStep,
  onAddVideo,
  active,
}: {
  moduleId: string;
  onAddStep: (moduleId: string) => void;
  onAddVideo: (moduleId: string) => void;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP + moduleId });
  return (
    <li
      ref={setNodeRef}
      className={cn(
        'flex items-center',
        active && 'rounded-lg border border-dashed border-line',
        isOver && 'bg-brand/10',
      )}
    >
      <button
        type="button"
        onClick={() => onAddStep(moduleId)}
        className="tree-item sub min-w-0 flex-1 border-0 bg-transparent text-left text-xs text-muted"
      >
        {t('admin.addStep')}
      </button>
      {/* fəslin sonuna video dərs (böyük fayl, irəliləyiş faizi ilə) */}
      <button
        type="button"
        onClick={() => onAddVideo(moduleId)}
        className="tree-item sub w-auto shrink-0 border-0 bg-transparent text-xs text-muted"
        data-testid={`add-video-${moduleId}`}
      >
        {t('admin.videoAdd')}
      </button>
    </li>
  );
}
