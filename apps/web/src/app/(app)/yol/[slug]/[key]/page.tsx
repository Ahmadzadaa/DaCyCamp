import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { PathItemViewDto } from '@dacy/shared';
import { ApiError } from '@/lib/api/errors';
import { apiFetch, getCurrentUser, isStaff } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { Markdown } from '@/components/app/markdown';
import { TrackBadge } from '@/components/app/track-badge';
import { ProjectForm } from '@/components/path/project-form';
import { AssessmentForm } from '@/components/path/assessment-form';
import { MilestoneClaim } from '@/components/path/milestone-claim';

type Props = {
  params: Promise<{ slug: string; key: string }>;
  searchParams: Promise<{ onizle?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return { title: key };
}

const TYPE_LABEL = {
  COURSE: () => t('paths.itemCourse'),
  PROJECT: () => t('paths.itemProject'),
  ASSESSMENT: () => t('paths.itemAssessment'),
  MILESTONE: () => t('paths.itemMilestone'),
} as const;

/** Layihə / imtahan / final səhifəsi (kurs addımı birbaşa kursa yönlənir) */
export default async function PathItemPage({ params, searchParams }: Props) {
  const { slug, key } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(`/yol/${slug}/${key}`)}`);
  const preview = !!sp.onizle && isStaff(user);
  let v: PathItemViewDto;
  try {
    v = await apiFetch<PathItemViewDto>(
      `/learn/paths/${slug}/items/${key}${preview ? '?preview=1' : ''}`,
    );
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'PATH_NOT_ENROLLED' || e.code === 'PATH_ITEM_LOCKED')
        redirect(`/yol/${slug}?kilid=${encodeURIComponent(key)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  if (v.item.type === 'COURSE') redirect(v.item.url);
  const color = v.path.track.color;
  return (
    <div className="mx-auto max-w-[860px]" style={{ ['--c' as string]: color }}>
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/yol/${v.path.slug}`} className="hover:underline">
          ← {v.path.title}
        </Link>
        {v.item.number ? <span> · {t('paths.stepN', { n: v.item.number })}</span> : null}
      </nav>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <TrackBadge color={color}>{v.path.track.title}</TrackBadge>
          <span className="ntype">{TYPE_LABEL[v.item.type]()}</span>
          {v.item.xp ? <span className="text-xs text-muted">+{v.item.xp} XP</span> : null}
          {v.item.state === 'completed' ? (
            <span className="text-xs font-semibold text-ok">✓ {t('paths.completed')}</span>
          ) : null}
        </div>
        <h1 className="mt-2 text-2xl">{v.item.title}</h1>
      </header>

      {v.project ? (
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <div className="box">
            <Markdown content={v.project.instructions} />
            {v.project.deliverables.length ? (
              <>
                <h3 className="mt-4 text-base font-semibold">{t('paths.deliverables')}</h3>
                <ol className="mt-1 list-decimal pl-5 text-sm">
                  {v.project.deliverables.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
          <ProjectForm itemId={v.item.id} project={v.project} preview={preview} />
        </div>
      ) : null}
      {v.assessment ? (
        <AssessmentForm itemId={v.item.id} assessment={v.assessment} preview={preview} />
      ) : null}
      {v.milestone ? (
        <div className="grid gap-5 md:grid-cols-[1fr_320px]">
          <div className="box">
            {v.milestone.description ? (
              <Markdown content={v.milestone.description} />
            ) : (
              <p className="text-sm text-muted">{t('paths.afterAll')}</p>
            )}
          </div>
          <MilestoneClaim itemId={v.item.id} milestone={v.milestone} preview={preview} />
        </div>
      ) : null}
    </div>
  );
}
