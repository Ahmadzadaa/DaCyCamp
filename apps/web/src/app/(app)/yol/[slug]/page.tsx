import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Award, PartyPopper } from 'lucide-react';
import type { PathDetailDto } from '@dacy/shared';
import { apiTry, getCurrentUser, isStaff } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { TrackBadge } from '@/components/app/track-badge';
import { HeroArt } from '@/components/app/hero-art';
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
    <div style={{ ['--c' as string]: color }}>
      <section className="hero sm accent">
        <div className="min-w-0">
          <div className="hero-k">
            <TrackBadge color={color}>{path.track.title}</TrackBadge>
            <span className="badge badge-mint">{t('paths.careerPath')}</span>
            <span className="badge badge-onhero">{t(`level.${path.level}`)}</span>
          </div>
          <h1 className="mt-3">{path.title}</h1>
          {path.description ? <p>{path.description}</p> : null}
          <div className="lp-facts">
            <div>
              <b>{path.courseCount}</b>
              <span>{t('paths.factsCourses')}</span>
            </div>
            {path.projectCount ? (
              <div>
                <b>{path.projectCount}</b>
                <span>{t('paths.factsProjects')}</span>
              </div>
            ) : null}
            {path.assessmentCount ? (
              <div>
                <b>{path.assessmentCount}</b>
                <span>{t('paths.factsExams')}</span>
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
          <div className="hero-act">
            {d.completedAt ? (
              <>
                <span className="done-pill">
                  <PartyPopper aria-hidden />
                  {t('paths.finishedBanner')}
                </span>
                {d.certificateId ? (
                  <Link
                    href={`/sertifikat/${d.certificateId}`}
                    className="b b-brand"
                    data-testid="path-cert"
                  >
                    <Award aria-hidden />
                    {t('paths.openCertificate')}
                  </Link>
                ) : null}
              </>
            ) : (
              <PathEnrollButton
                slug={path.slug}
                enrolled={d.enrolled}
                isActive={d.isActive}
                continueUrl={d.continueUrl}
                loggedIn={!!user}
              />
            )}
          </div>
        </div>
        <HeroArt kind="route" />
      </section>

      <div className="lp">
        <div className="min-w-0">
          <PathMap items={d.items} color={color} enrolled={d.enrolled || preview} />
        </div>

        <aside className="flex flex-col gap-4">
          {path.skills.length ? (
            <div className="box">
              <h2 className="box-h">{t('paths.skills')}</h2>
              <div className="skills">
                {path.skills.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          {path.targetAudience ? (
            <div className="box">
              <h2 className="box-h">{t('paths.audience')}</h2>
              <p className="text-sm text-muted">{path.targetAudience}</p>
            </div>
          ) : null}
          <div className="box">
            <h2 className="box-h">
              <Award aria-hidden /> {t('paths.certificate')}
            </h2>
            <p className="text-sm text-muted">{t('paths.afterAll')}</p>
          </div>
          {d.otherPaths.length ? (
            <div className="box">
              <h2 className="box-h">{t('paths.others')}</h2>
              <div className="paths">
                {d.otherPaths.map((o) => (
                  <Link key={o.id} href={`/yol/${o.slug}`}>
                    <span className="min-w-0 truncate">{o.title}</span>
                    <TrackBadge color={o.track.color}>{o.track.title}</TrackBadge>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
