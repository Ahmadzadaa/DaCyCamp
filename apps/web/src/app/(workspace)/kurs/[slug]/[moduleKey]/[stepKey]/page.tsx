import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { StepViewDto } from '@dacy/shared';
import { apiFetch, getCurrentUser, isStaff } from '@/lib/api/server';
import { ApiError } from '@/lib/api/errors';
import { WorkspaceTop } from '@/components/workspace/workspace-top';
import { StepStart } from '@/components/workspace/step-start';
import { TheoryView } from '@/components/workspace/theory-view';
import { QuizView } from '@/components/workspace/quiz-view';
import { SplitLayout } from '@/components/workspace/split-layout';
import { InstructionsPane } from '@/components/workspace/instructions-pane';
import { RightPlaceholder } from '@/components/workspace/right-placeholder';
import { SqlWorkspace } from '@/components/workspace/sql-workspace';
import { PythonWorkspace } from '@/components/workspace/python-workspace';
import { CtfWorkspace } from '@/components/workspace/ctf-workspace';

type Props = {
  params: Promise<{ slug: string; moduleKey: string; stepKey: string }>;
  searchParams: Promise<{ onizle?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Dərs · ${slug}` };
}

const isInt = (s: string) => /^\d+$/.test(s);

export default async function LessonPage({ params, searchParams }: Props) {
  const { slug, moduleKey, stepKey } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(`/kurs/${slug}/${moduleKey}/${stepKey}`)}`);
  const preview = !!sp.onizle && isStaff(user);
  const q = preview ? '?preview=1' : '';

  // dizayndakı /kurs/x/2/4 forması → açarlar
  if (isInt(moduleKey) && isInt(stepKey)) {
    let target: { moduleKey: string; stepKey: string } | null = null;
    try {
      target = await apiFetch<{ moduleKey: string; stepKey: string }>(
        `/learn/courses/${slug}/position/${moduleKey}/${stepKey}${q}`,
      );
    } catch {
      target = null;
    }
    if (!target) notFound();
    redirect(`/kurs/${slug}/${target.moduleKey}/${target.stepKey}${preview ? '?onizle=1' : ''}`);
  }

  let view: StepViewDto | null = null;
  let go: string | null = null;
  try {
    view = await apiFetch<StepViewDto>(`/learn/courses/${slug}/steps/${moduleKey}/${stepKey}${q}`);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'STEP_LOCKED') go = `/kurs/${slug}?kilid=${encodeURIComponent(stepKey)}`;
      else if (e.code === 'NOT_ENROLLED') go = `/kurs/${slug}`;
      else if (e.status === 404) notFound();
      else throw e;
    } else throw e;
  }
  if (go) redirect(go);
  if (!view) notFound();

  const v = view.view;
  return (
    <>
      <WorkspaceTop view={view} />
      <StepStart stepId={view.id} enabled={!preview && view.state !== 'completed'} />
      {v.kind === 'theory' ? (
        <TheoryView view={view} content={v} />
      ) : v.kind === 'quiz' ? (
        <QuizView view={view} quiz={v} />
      ) : (
        <SplitLayout
          left={<InstructionsPane view={view} />}
          right={
            v.kind === 'sql' ? (
              <SqlWorkspace view={view} sql={v} />
            ) : v.kind === 'python' ? (
              <PythonWorkspace view={view} py={v} />
            ) : v.kind === 'ctf' ? (
              <CtfWorkspace view={view} ctf={v} />
            ) : (
              <RightPlaceholder view={view} />
            )
          }
        />
      )}
    </>
  );
}
