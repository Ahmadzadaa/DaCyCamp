'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Check, Compass } from 'lucide-react';
import type { PathCardDto, TrackDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { HeroArt } from '@/components/app/hero-art';
import { LevelBars } from '@/components/app/level-bars';
import { TrackTile } from '@/components/app/track-icon';
import { pathFacts } from '@/components/app/path-card';

/** «Hansı peşəyə hazırlaşırsınız?» — 1) istiqamət seç → 2) uyğun yollar → «Bu yola başla» */
export function Onboarding({ tracks, paths }: { tracks: TrackDto[]; paths: PathCardDto[] }) {
  const router = useRouter();
  const [track, setTrack] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const suggested = track ? paths.filter((p) => p.track.slug === track) : [];

  async function choose(slug: string) {
    setBusy(slug);
    try {
      await api('/me/target-path', { method: 'PUT', body: { pathSlug: slug } });
      toast.success(t('paths.targetSaved'));
      router.push(`/yol/${slug}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div>
      <section className="hero">
        <div>
          <div className="hero-k">
            <span className="badge badge-mint">
              <Compass aria-hidden />
              {t('paths.careerPath')}
            </span>
          </div>
          <h1 className="mt-3">{t('paths.onboardingTitle')}</h1>
          <p>{t('paths.onboardingDesc')}</p>
        </div>
        <HeroArt kind="route" />
      </section>

      <div className="step-h">
        <span className="n">1</span>
        <h2>{t('onboarding.pickTrack')}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label={t('common.track')}>
        {tracks.map((tr) => (
          <button
            key={tr.slug}
            type="button"
            role="radio"
            aria-checked={track === tr.slug}
            onClick={() => setTrack(tr.slug)}
            className="pick"
            style={{ ['--c' as string]: tr.color }}
            data-testid="onboarding-track"
          >
            <TrackTile color={tr.color} icon={tr.icon} slug={tr.slug} size="lg" />
            <h3>{tr.title}</h3>
            {tr.description ? <p>{tr.description}</p> : null}
            {track === tr.slug ? (
              <span className="pick-ok" aria-hidden>
                <Check />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {track ? (
        <>
          <div className="step-h">
            <span className="n">2</span>
            <h2>{t('paths.suggested')}</h2>
          </div>
          {suggested.length === 0 ? (
            <p className="box text-muted">{t('paths.noSuggestion')}</p>
          ) : (
            <div className="cards">
              {suggested.map((p) => (
                <article
                  key={p.id}
                  className="kc"
                  style={{ ['--c' as string]: p.track.color }}
                  data-testid="onboarding-path"
                  data-slug={p.slug}
                >
                  <span className="kind">
                    {t('paths.kind')} · {p.track.title}
                  </span>
                  <h3>{p.title}</h3>
                  <LevelBars level={p.level} color={p.track.color} />
                  {p.description ? <p>{p.description}</p> : null}
                  <div className="path-parts">{pathFacts(p).slice(1).join(' · ')}</div>
                  <div className="ft">
                    <span className="dur">
                      <TrackTile color={p.track.color} icon={p.track.icon} slug={p.track.slug} />
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      loading={busy === p.slug}
                      onClick={() => void choose(p.slug)}
                    >
                      {t('paths.chooseThis')}
                      <ArrowRight aria-hidden />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
      <div className="mt-10 flex justify-center">
        <Button type="button" variant="ghost" onClick={() => router.push('/kurslar')}>
          {t('paths.skip')}
        </Button>
      </div>
    </div>
  );
}
