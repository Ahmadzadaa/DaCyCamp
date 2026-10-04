import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Database,
  Flag,
  Play,
  Route,
  SquareTerminal,
  UserPlus,
  Compass,
  Zap,
  Code2,
} from 'lucide-react';
import type { CourseCardDto, LevelLabels, PathCardDto, TrackDto } from '@dacy/shared';
import { t, type TKey } from '@/lib/i18n';
import { FEATURES as FLAGS } from '@/lib/features';
import { fmtHours, fmtNum } from '@/lib/utils';
import { Logo } from '@/components/app/logo';
import { PathCard } from '@/components/app/path-card';
import { TrackTile } from '@/components/app/track-icon';

const FEATURES: Array<{ icon: typeof Database; title: TKey; text: TKey; c: string }> = [
  { icon: Database, title: 'landing.feat.sqlTitle', text: 'landing.feat.sqlText', c: '#6C7CF0' },
  { icon: Code2, title: 'landing.feat.pyTitle', text: 'landing.feat.pyText', c: '#E8A33D' },
  {
    icon: SquareTerminal,
    title: 'landing.feat.termTitle',
    text: 'landing.feat.termText',
    c: '#2BD4A4',
  },
  { icon: Flag, title: 'landing.feat.ctfTitle', text: 'landing.feat.ctfText', c: '#EF6F8E' },
  { icon: Route, title: 'landing.feat.pathTitle', text: 'landing.feat.pathText', c: '#4F5BD5' },
  { icon: Award, title: 'landing.feat.certTitle', text: 'landing.feat.certText', c: '#169C77' },
];

const STEPS: Array<{ icon: typeof UserPlus; title: TKey; text: TKey }> = [
  { icon: UserPlus, title: 'landing.how1Title', text: 'landing.how1Text' },
  { icon: Compass, title: 'landing.how2Title', text: 'landing.how2Text' },
  { icon: Zap, title: 'landing.how3Title', text: 'landing.how3Text' },
];

const FAQ = [1, 2, 3, 4, 5] as const;
/** xülasədə hər istiqamətdən göstərilən kurs adı sayı */
const CAT_MAX = 5;

/** Qonaq üçün tanışlıq səhifəsi: platformanı göstərir, yuxarı sağda «Daxil ol / Qeydiyyat» */
export function Landing({
  tracks,
  courses,
  paths,
  levels,
}: {
  tracks: TrackDto[];
  courses: CourseCardDto[];
  paths: PathCardDto[];
  levels: LevelLabels;
}) {
  const tasks = courses.reduce(
    (n, c) =>
      n +
      Object.entries(c.stepTypeCounts)
        .filter(([k]) => k !== 'THEORY')
        .reduce((m, [, v]) => m + (v ?? 0), 0),
    0,
  );
  const courseCount = (slug: string) => courses.filter((c) => c.track.slug === slug).length;
  const catalog = tracks
    .map((track) => {
      const items = courses.filter((c) => c.track.slug === track.slug);
      return { track, items, hours: items.reduce((h, c) => h + (c.estimatedHours ?? 0), 0) };
    })
    .filter((g) => g.items.length);

  return (
    <div className="ld">
      <a href="#main" className="skip">
        Məzmuna keç
      </a>
      <header className="ld-top">
        <div className="ld-in ld-top-in">
          <Logo text={t('app.name')} href="/" />
          <nav className="ld-nav" aria-label={t('shell.sideNav')}>
            <Link href="/kurslar">{t('landing.navCourses')}</Link>
            <Link href="/yollar">{t('landing.navPaths')}</Link>
            <a href="#nece-isleyir">{t('landing.navHow')}</a>
            <a href="#sual-cavab">{t('landing.navFaq')}</a>
          </nav>
          <div className="ld-auth">
            <Link href="/giris" className="b b-ghost b-sm" data-testid="landing-login">
              {t('landing.login')}
            </Link>
            <Link href="/qeydiyyat" className="b b-brand b-sm" data-testid="landing-signup">
              {t('landing.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="ld-in">
          <div className="ld-hero">
            <div className="ld-hero-copy">
              <span className="badge badge-mint">{t('landing.heroBadge')}</span>
              <h1>{t('landing.heroTitle')}</h1>
              <p>{t('landing.heroText')}</p>
              <div className="ld-hero-act">
                <Link href="/qeydiyyat" className="b b-brand">
                  {t('landing.heroCta')}
                  <ArrowRight aria-hidden />
                </Link>
                <Link href="/kurslar" className="b ld-b-dark">
                  <Play aria-hidden />
                  {t('landing.heroBrowse')}
                </Link>
              </div>
              <small>{t('landing.heroNote')}</small>
              {courses.length ? (
                <dl className="ld-stats">
                  <div>
                    <dt>{t('landing.statCourses')}</dt>
                    <dd>{fmtNum(courses.length)}</dd>
                  </div>
                  <div>
                    <dt>{t('landing.statTasks')}</dt>
                    <dd>{fmtNum(tasks)}</dd>
                  </div>
                  <div>
                    <dt>{t('landing.statTracks')}</dt>
                    <dd>{fmtNum(tracks.length)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
            <CodePreview />
          </div>
        </section>

        {/* İstiqamətlər */}
        {tracks.length ? (
          <section className="ld-in ld-sec" aria-labelledby="ld-tracks">
            <SectionHead
              id="ld-tracks"
              kicker="landing.tracksKicker"
              title="landing.tracksTitle"
              text="landing.tracksText"
            />
            <div className="ld-tracks">
              {tracks.map((tr) => (
                <Link
                  key={tr.slug}
                  href={`/kurslar?istiqamet=${tr.slug}`}
                  className="ld-track"
                  style={{ ['--c' as string]: tr.color }}
                >
                  <TrackTile color={tr.color} icon={tr.icon} slug={tr.slug} size="lg" />
                  <h3>{tr.title}</h3>
                  {tr.description ? <p>{tr.description}</p> : null}
                  <span className="ld-track-f">
                    {(tr.courseCount ?? courseCount(tr.slug))
                      ? t('landing.trackCourses', { n: tr.courseCount ?? courseCount(tr.slug) })
                      : t('landing.trackSoon')}
                    <ArrowRight aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Xüsusiyyətlər */}
        <section className="ld-band" aria-labelledby="ld-feat">
          <div className="ld-in ld-sec">
            <SectionHead
              id="ld-feat"
              kicker="landing.featKicker"
              title="landing.featTitle"
              text="landing.featText"
            />
            <div className="ld-feats">
              {FEATURES.map((f) => (
                <div key={f.title} className="ld-feat" style={{ ['--c' as string]: f.c }}>
                  <span className="tic lg" aria-hidden>
                    <f.icon />
                  </span>
                  <h3>{t(f.title)}</h3>
                  <p>{t(f.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Necə işləyir */}
        <section className="ld-in ld-sec" id="nece-isleyir" aria-labelledby="ld-how">
          <SectionHead id="ld-how" kicker="landing.howKicker" title="landing.howTitle" />
          <ol className="ld-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="ld-step-n">{i + 1}</span>
                <s.icon aria-hidden className="ld-step-ic" />
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Kurslar — qısa xülasə: istiqamət üzrə yalnız ad, səviyyə, müddət (təsvir və məzmun girişdən sonra) */}
        {catalog.length ? (
          <section className="ld-in ld-sec" aria-labelledby="ld-courses">
            <SectionHead
              id="ld-courses"
              kicker="landing.coursesKicker"
              title="landing.coursesTitle"
              text="landing.coursesText"
            />
            <div className="ld-cat">
              {catalog.map(({ track, items, hours }) => (
                <div
                  key={track.slug}
                  className="ld-cat-g"
                  style={{ ['--c' as string]: track.color }}
                >
                  <div className="ld-cat-h">
                    <TrackTile color={track.color} icon={track.icon} slug={track.slug} />
                    <div>
                      <h3>{track.title}</h3>
                      <span>
                        {t('landing.trackCourses', { n: items.length })}
                        {hours ? ` · ${t('common.hours', { n: fmtHours(hours) ?? 0 })}` : ''}
                      </span>
                    </div>
                  </div>
                  <ul>
                    {items.slice(0, CAT_MAX).map((c) => (
                      <li key={c.id}>
                        <Check aria-hidden />
                        <span className="ld-cat-t">{c.title}</span>
                        <span className="ld-cat-l">
                          {levels?.[c.level] ?? t(`level.${c.level}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {items.length > CAT_MAX ? (
                    <p className="ld-cat-more">
                      {t('landing.coursesMore', { n: items.length - CAT_MAX })}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="ld-cat-f">
              <p>{t('landing.coursesNote')}</p>
              <Link href="/qeydiyyat" className="b b-brand">
                {t('landing.coursesCta')}
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </section>
        ) : null}

        {/* Yollar */}
        {paths.length ? (
          <section className="ld-in ld-sec" aria-labelledby="ld-paths">
            <SectionHead
              id="ld-paths"
              kicker="landing.pathsKicker"
              title="landing.pathsTitle"
              more={{ href: '/yollar', label: 'landing.pathsAll' }}
            />
            <div className="cards">
              {paths.slice(0, 3).map((p) => (
                <PathCard key={p.slug} path={p} levels={levels} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Sual-cavab */}
        <section className="ld-in ld-sec" id="sual-cavab" aria-labelledby="ld-faq">
          <SectionHead id="ld-faq" kicker="landing.faqKicker" title="landing.faqTitle" />
          <div className="ld-faq">
            {FAQ.map((n) => (
              <details key={n}>
                <summary>
                  {t(`landing.faq.q${n}`)}
                  <ChevronDown aria-hidden />
                </summary>
                <p>{t(`landing.faq.a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Son çağırış */}
        <section className="ld-in ld-sec">
          <div className="ld-cta">
            <div>
              <h2>{t('landing.ctaTitle')}</h2>
              <p>{t('landing.ctaText')}</p>
            </div>
            <div className="ld-hero-act">
              <Link href="/qeydiyyat" className="b b-brand">
                {t('landing.signup')}
                <ArrowRight aria-hidden />
              </Link>
              <Link href="/giris" className="b ld-b-dark">
                {t('landing.login')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="ld-foot">
        <div className="ld-in ld-foot-in">
          <div className="ld-foot-brand">
            <Logo text={t('app.name')} href="/" />
            <p>{t('landing.footerText')}</p>
          </div>
          <nav aria-label={t('landing.footerLearn')}>
            <b>{t('landing.footerLearn')}</b>
            <Link href="/kurslar">{t('landing.navCourses')}</Link>
            <Link href="/yollar">{t('landing.navPaths')}</Link>
            {FLAGS.contests ? <Link href="/yarislar">{t('shell.contests')}</Link> : null}
            <Link href="/liderler">{t('shell.leaderboard')}</Link>
          </nav>
          <nav aria-label={t('landing.footerAccount')}>
            <b>{t('landing.footerAccount')}</b>
            <Link href="/qeydiyyat">{t('landing.signup')}</Link>
            <Link href="/giris">{t('landing.login')}</Link>
          </nav>
        </div>
        <div className="ld-in ld-rights">
          {t('landing.rights', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  text,
  more,
}: {
  id: string;
  kicker: TKey;
  title: TKey;
  text?: TKey;
  more?: { href: string; label: TKey };
}) {
  return (
    <div className="ld-head">
      <div>
        <span className="ld-kicker">{t(kicker)}</span>
        <h2 id={id}>{t(title)}</h2>
        {text ? <p>{t(text)}</p> : null}
      </div>
      {more ? (
        <Link href={more.href} className="b b-ghost b-sm">
          {t(more.label)}
          <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Hero-dakı məhsul görüntüsü: SQL redaktoru + nəticə cədvəli + «Düzgündür» (statik, dekorativ) */
function CodePreview() {
  return (
    <div className="ld-preview-wrap" aria-hidden>
      <div className="ld-preview">
        <div className="ld-win">
          <i />
          <i />
          <i />
          <b>{t('landing.previewTitle')}</b>
          <span className="ld-run">
            <Play />
            {t('landing.previewRun')}
          </span>
        </div>
        <pre className="ld-code">
          <code>
            <span className="k">SELECT</span> region, <span className="f">SUM</span>(amount){' '}
            <span className="k">AS</span> total{'\n'}
            <span className="k">FROM</span> satislar{'\n'}
            <span className="k">WHERE</span> il = <span className="n">2026</span>
            {'\n'}
            <span className="k">GROUP BY</span> region{'\n'}
            <span className="k">ORDER BY</span> total <span className="k">DESC</span>;
          </code>
        </pre>
        <table className="ld-res">
          <thead>
            <tr>
              <th>region</th>
              <th>total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bakı</td>
              <td>184 250</td>
            </tr>
            <tr>
              <td>Gəncə</td>
              <td>62 870</td>
            </tr>
            <tr>
              <td>Sumqayıt</td>
              <td>41 300</td>
            </tr>
          </tbody>
        </table>
        <div className="ld-ok">
          <Check />
          {t('landing.previewOk')}
        </div>
      </div>
      <div className="ld-float">
        <Zap />
        <span>
          <b>+50 XP</b>
          <small>{t('landing.previewStreak')}</small>
        </span>
      </div>
    </div>
  );
}
