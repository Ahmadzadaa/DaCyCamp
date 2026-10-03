'use client';
import { useCallback, useMemo, useState } from 'react';
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
import { CourseHeader, TAB_PARAM, parseTab, type CourseTab } from './course-header';
import { CourseStudents } from './course-students';
import { AssetsLibrary } from '../assets-library';
import { AuditLog } from '../audit-log';
import { nodeParam, parseNode, type Selection } from './types';

/**
 * /admin/kurslar/[slug] — başlıq (kurs əməliyyatları) + tablar: Məzmun (sol ağac + sağ redaktor),
 * Tələbələr, Fayllar, Tarixçə. Seçim `?node=`, tab `?tab=` ilə sinxrondur.
 */
export function CourseEditor({
  initialCourse,
  initialAssets,
  tracks,
  initialNode,
  initialTab,
}: {
  initialCourse: AdminCourseTreeDto;
  initialAssets: AssetDto[];
  tracks: TrackDto[];
  initialNode?: string;
  initialTab?: string;
}) {
  const [course, setCourse] = useState<AdminCourseDto>(initialCourse);
  const [tab, setTab] = useState<CourseTab>(() => parseTab(initialTab));
  const [modules, setModules] = useState<AdminModuleNode[]>(initialCourse.modules);
  const [assets, setAssets] = useState<AssetDto[]>(initialAssets);
  const [sel, setSel] = useState<Selection>(() => parseNode(initialNode));
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addStepFor, setAddStepFor] = useState<string | null>(null);

  const selectTab = useCallback((tb: CourseTab) => {
    setTab(tb);
    const url = new URL(window.location.href);
    if (tb === 'content') url.searchParams.delete('tab');
    else url.searchParams.set('tab', TAB_PARAM[tb]);
    window.history.replaceState(null, '', url.toString());
  }, []);

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
    <div className="flex flex-col gap-5">
      <CourseHeader course={course} onChange={setCourse} tab={tab} onTab={selectTab} />
      {tab === 'students' ? <CourseStudents courseId={course.id} modules={modules} /> : null}
      {tab === 'files' ? (
        <AssetsLibrary courses={[]} fixedCourseId={course.id} onAssetsChange={setAssets} />
      ) : null}
      {tab === 'history' ? <AuditLog courseId={course.id} compact /> : null}
      <div
        className="card admin-ed grid overflow-hidden md:grid-cols-[280px_1fr]"
        hidden={tab !== 'content'}
      >
        <CourseTree
          course={course}
          modules={modules}
          setModules={setModules}
          selected={effective}
          onSelect={select}
          onAddModule={() => setAddModuleOpen(true)}
          onAddStep={(id) => setAddStepFor(id)}
        />
        <section className="min-w-0 p-5 md:px-7 md:py-6" aria-live="polite">
          {effective.kind === 'course' ? (
            <CourseForm
              course={course}
              tracks={tracks}
              onChange={setCourse}
              onAssetUploaded={onAssetUploaded}
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
    </div>
  );
}
