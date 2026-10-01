'use client';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AdminCourseDto,
  AdminCourseTreeDto,
  AdminModuleNode,
  AdminStepNode,
  AssetDto,
  TrackDto,
} from '@dacy/shared';
import { upsertAsset } from '../upload';
import { CourseTree } from './course-tree';
import { CourseForm } from './course-form';
import { ModuleForm } from './module-form';
import { StepEditor } from './step-editor';
import { AddModuleDialog } from './add-module-dialog';
import { AddStepDialog } from './add-step-dialog';
import { nodeParam, parseNode, type Selection } from './types';

/** /admin/kurslar/[slug] — sol ağac + sağ redaktor; seçim `?node=` ilə sinxrondur */
export function CourseEditor({
  initialCourse,
  initialAssets,
  tracks,
  initialNode,
}: {
  initialCourse: AdminCourseTreeDto;
  initialAssets: AssetDto[];
  tracks: TrackDto[];
  initialNode?: string;
}) {
  const router = useRouter();
  const [course, setCourse] = useState<AdminCourseDto>(initialCourse);
  const [modules, setModules] = useState<AdminModuleNode[]>(initialCourse.modules);
  const [assets, setAssets] = useState<AssetDto[]>(initialAssets);
  const [sel, setSel] = useState<Selection>(() => parseNode(initialNode));
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addStepFor, setAddStepFor] = useState<string | null>(null);

  const select = useCallback((s: Selection) => {
    setSel(s);
    const url = new URL(window.location.href);
    url.searchParams.set('node', nodeParam(s));
    window.history.replaceState(null, '', url.toString());
  }, []);

  const moduleSel = sel.kind === 'module' ? modules.find((m) => m.id === sel.id) : undefined;
  const stepSel = useMemo(() => {
    if (sel.kind !== 'step') return undefined;
    for (const m of modules) {
      const s = m.steps.find((x) => x.id === sel.id);
      if (s) return { module: m, step: s };
    }
    return undefined;
  }, [sel, modules]);
  const effective: Selection =
    sel.kind === 'course' || moduleSel || stepSel ? sel : { kind: 'course' };

  const patchModule = useCallback(
    (id: string, patch: Partial<AdminModuleNode>) =>
      setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    [],
  );
  const patchStep = useCallback(
    (id: string, patch: Partial<AdminStepNode>) =>
      setModules((ms) =>
        ms.map((m) => ({
          ...m,
          steps: m.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      ),
    [],
  );
  const onAssetUploaded = useCallback((a: AssetDto) => setAssets((as) => upsertAsset(as, a)), []);

  return (
    <div className="card grid overflow-hidden md:grid-cols-[260px_1fr]">
      <CourseTree
        course={course}
        modules={modules}
        setModules={setModules}
        selected={effective}
        onSelect={select}
        onAddModule={() => setAddModuleOpen(true)}
        onAddStep={(id) => setAddStepFor(id)}
      />
      <section className="min-w-0 p-5 md:p-6" aria-live="polite">
        {effective.kind === 'course' ? (
          <CourseForm
            course={course}
            tracks={tracks}
            onChange={setCourse}
            onAssetUploaded={onAssetUploaded}
            onDeleted={() => router.push('/admin/kurslar')}
          />
        ) : null}
        {effective.kind === 'module' && moduleSel ? (
          <ModuleForm
            key={moduleSel.id}
            module={moduleSel}
            onChange={(p) => patchModule(moduleSel.id, p)}
            onDeleted={() => {
              setModules((ms) => ms.filter((m) => m.id !== moduleSel.id));
              select({ kind: 'course' });
            }}
          />
        ) : null}
        {effective.kind === 'step' && stepSel ? (
          <StepEditor
            key={stepSel.step.id}
            stepId={stepSel.step.id}
            courseId={course.id}
            courseSlug={course.slug}
            moduleKey={stepSel.module.key}
            stepKey={stepSel.step.key}
            assets={assets}
            onAssetUploaded={onAssetUploaded}
            onMeta={(p) => patchStep(stepSel.step.id, p)}
            onDeleted={() => {
              const mid = stepSel.module.id;
              setModules((ms) =>
                ms.map((m) => ({ ...m, steps: m.steps.filter((s) => s.id !== stepSel.step.id) })),
              );
              select({ kind: 'module', id: mid });
            }}
          />
        ) : null}
      </section>
      <AddModuleDialog
        open={addModuleOpen}
        onOpenChange={setAddModuleOpen}
        courseId={course.id}
        onCreated={(m) => {
          setModules((ms) => [...ms, m]);
          select({ kind: 'module', id: m.id });
        }}
      />
      <AddStepDialog
        moduleId={addStepFor}
        onOpenChange={(o) => {
          if (!o) setAddStepFor(null);
        }}
        onCreated={(moduleId, s) => {
          setModules((ms) =>
            ms.map((m) => (m.id === moduleId ? { ...m, steps: [...m.steps, s] } : m)),
          );
          select({ kind: 'step', id: s.id });
        }}
      />
    </div>
  );
}
