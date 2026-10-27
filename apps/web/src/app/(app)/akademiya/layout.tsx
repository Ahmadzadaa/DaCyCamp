import { AcademyFrame } from '@/components/classroom/academy-frame';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { t } from '@/lib/i18n';
import { HeroArt } from '@/components/app/hero-art';
import { SubNav } from '@/components/academy/sub-nav';

/** «Mənim akademiyam»: tələbənin qrupları, tapşırıqları, qiymətləri, cədvəli və davamiyyəti */
export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/giris?next=/akademiya');
  return (
    <AcademyFrame
      header={
        <>
          <section className="hero sm">
            <div>
              <div className="hero-k">
                <h1>{t('academy.title')}</h1>
              </div>
              <p>{t('academy.intro')}</p>
            </div>
            <HeroArt kind="dashboard" />
          </section>
          <SubNav
            label={t('academy.title')}
            items={[
              { href: '/akademiya', label: 'academy.tabs.overview', exact: true },
              { href: '/akademiya/tapsiriqlar', label: 'academy.tabs.assignments' },
              { href: '/akademiya/qiymetler', label: 'academy.tabs.grades' },
              { href: '/akademiya/cedvel', label: 'academy.tabs.schedule' },
              { href: '/akademiya/davamiyyet', label: 'academy.tabs.attendance' },
            ]}
          />
        </>
      }
    >
      {children}
    </AcademyFrame>
  );
}
