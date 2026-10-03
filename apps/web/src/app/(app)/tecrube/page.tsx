import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen, FlaskConical } from 'lucide-react';
import type { PracticeDto } from '@dacy/shared';
import { apiTry } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/components/app/empty-state';
import { HeroArt } from '@/components/app/hero-art';
import { PracticeList } from '@/components/hub/practice-list';

export const metadata: Metadata = { title: t('hub.practiceTitle') };

export default async function PracticePage() {
  const d = await apiTry<PracticeDto>('/me/practice');
  if (!d) redirect('/giris?next=/tecrube');
  const pct = d.counts.total ? Math.round((d.counts.done / d.counts.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-6">
      <section className="hero sm">
        <div>
          <div className="hero-k">
            <h1>{t('hub.practiceTitle')}</h1>
            {d.counts.total ? (
              <span className="badge badge-mint">
                {t('hub.practiceProgress', { done: d.counts.done, total: d.counts.total })}
              </span>
            ) : null}
          </div>
          <p>{t('hub.practiceText')}</p>
          {d.counts.total ? (
            <div className="hero-bar" aria-hidden>
              <i style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </div>
        <HeroArt kind="flask" />
      </section>
      {d.counts.total === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={t('hub.practiceEmpty')}
          description={t('hub.practiceEmptyHint')}
          action={
            <Link href="/kurslar" className="b b-brand">
              <BookOpen aria-hidden />
              {t('dash.browse')}
            </Link>
          }
        />
      ) : (
        <PracticeList data={d} />
      )}
    </div>
  );
}
