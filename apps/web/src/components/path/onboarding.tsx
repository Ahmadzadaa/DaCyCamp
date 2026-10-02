'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Compass } from 'lucide-react';
import type { PathCardDto, TrackDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TrackBadge } from '@/components/app/track-badge';
import { pathFacts } from '@/components/app/path-card';

/** «Hansı peşəyə hazırlaşırsınız?» — istiqamət seç → uyğun yollar → «Bu yola başla» */
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
    <div className="mx-auto max-w-[860px]">
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 size-10 text-brand" />
        <h1 className="text-2xl">{t('paths.onboardingTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('paths.onboardingDesc')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('common.track')}>
        {tracks.map((tr) => (
          <button
            key={tr.slug}
            type="button"
            role="radio"
            aria-checked={track === tr.slug}
            onClick={() => setTrack(tr.slug)}
            className={cn(
              'box text-left transition hover:border-brand',
              track === tr.slug && 'border-2 border-brand',
            )}
            style={{ ['--c' as string]: tr.color }}
            data-testid="onboarding-track"
          >
            <TrackBadge color={tr.color}>{tr.title}</TrackBadge>
            {tr.description ? <p className="mt-2 text-sm text-muted">{tr.description}</p> : null}
          </button>
        ))}
      </div>
      {track ? (
        <div className="mt-6">
          <h2 className="mb-3 text-lg">{t('paths.suggested')}</h2>
          {suggested.length === 0 ? (
            <p className="text-sm text-muted">{t('paths.noSuggestion')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {suggested.map((p) => (
                <div
                  key={p.id}
                  className="box flex flex-col gap-2"
                  style={{ ['--c' as string]: p.track.color }}
                  data-testid="onboarding-path"
                  data-slug={p.slug}
                >
                  <b>{p.title}</b>
                  <p className="line-clamp-3 text-sm text-muted">{p.description}</p>
                  <div className="text-xs text-muted">{pathFacts(p).join(' · ')}</div>
                  <Button
                    type="button"
                    loading={busy === p.slug}
                    onClick={() => void choose(p.slug)}
                    className="mt-1 self-start"
                  >
                    {t('paths.chooseThis')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <div className="mt-8 text-center">
        <Button type="button" variant="ghost" onClick={() => router.push('/kurslar')}>
          {t('paths.skip')}
        </Button>
      </div>
    </div>
  );
}
