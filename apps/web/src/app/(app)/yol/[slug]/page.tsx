import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award } from 'lucide-react';
import type { PathDetailDto } from '@dacy/shared';
import { apiTry, getCurrentUser, isStaff } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TrackBadge } from '@/components/app/track-badge';
import { PathMap } from '@/components/path/path-map';
import { PathEnrollButton } from '@/components/path/path-enroll-button';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ onizle?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await apiTry<PathDetailDto>(`/paths/${slug}`);
  return { title: d ? d.path.title : t('nav.paths') };
}

export default async function PathPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const preview = !!sp.onizle && isStaff(user);
  const d = await apiTry<PathDetailDto>(`/paths/${slug}${preview ? '?preview=1' : ''}`);
  if (!d) notFound();
  const { path } = d;
  const color = path.track.color;
  return (
    <div className="lp" style={{ ['--c' as string]: color }}>
      <header className="lp-head">
        <div>
          <TrackBadge color={color}>
            {path.track.title} · {t('paths.careerPath')}
          </TrackBadge>
          <h1>{path.title}</h1>
          <p>{path.description}</p>
          <div className="lp-facts">
            <div>
              <b>{path.courseCount}</b>
              <span>{t('paths.courses', { n: '' }).trim()}</span>
            </div>
            {path.projectCount ? (
              <div>
                <b>{path.projectCount}</b>
                <span>{t('paths.projects', { n: '' }).trim()}</span>
              </div>
            ) : null}
            {path.estimatedHours ? (
              <div>
                <b>{t('paths.hoursTotal', { n: path.estimatedHours })}</b>
                <span>{t('paths.hoursLabel')}</span>
              </div>
            ) : null}
            {d.enrolled ? (
              <div>
                <b data-testid="path-percent">{d.map.percent}%</b>
                <span>{t('paths.completedPct')}</span>
              </div>
            ) : null}
          </div>
          {d.completedAt ? (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-brand/15 px-3 py-1 text-sm font-semibold text-brand">
              🎉 {t('paths.finishedBanner')}
              {d.certificateId ? (
                <Link
                  href={`/sertifikat/${d.certificateId}`}
                  className="underline"
                  data-testid="path-cert"
                >
                  {t('paths.openCertificate')}
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
        <PathEnrollButton
          slug={path.slug}
          enrolled={d.enrolled}
          isActive={d.isActive}
          continueUrl={d.continueUrl}
          loggedIn={!!user}
        />
      </header>

      <div>
        <PathMap items={d.items} color={color} enrolled={d.enrolled || preview} />
      </div>

      <aside className="side">
        {path.skills.length ? (
          <div className="box">
            <b>{t('paths.skills')}</b>
            <div className="skills">
              {path.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        ) : null}
        {path.targetAudience ? (
          <div className="box">
            <b>{t('paths.audience')}</b>
            <p className="mt-1.5 text-sm text-muted">{path.targetAudience}</p>
          </div>
        ) : null}
        <div className="box">
          <b className="flex items-center gap-2">
            <Award className="size-4" /> {t('paths.certificate')}
          </b>
          <p className="mt-1.5 text-sm text-muted">{t('paths.afterAll')}</p>
        </div>
        {d.otherPaths.length ? (
          <div className="box">
            <b>{t('paths.others')}</b>
            <div className="paths">
              {d.otherPaths.map((o) => (
                <Link key={o.id} href={`/yol/${o.slug}`}>
                  <span>{o.title}</span>
                  <TrackBadge color={o.track.color}>{o.track.title}</TrackBadge>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
