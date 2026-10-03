import { Award, CodeXml, Route, SquareTerminal } from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { HeroArt } from '@/components/app/hero-art';
import { t } from '@/lib/i18n';

const FEATS = [
  { icon: CodeXml, text: 'auth.feat1' },
  { icon: SquareTerminal, text: 'auth.feat2' },
  { icon: Route, text: 'auth.feat3' },
  { icon: Award, text: 'auth.feat4' },
] as const;

/** Giriş / qeydiyyat: solda navy təqdimat paneli, sağda forma (mobil — yalnız forma) */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside" aria-hidden="false">
        <Logo text={t('shell.brand')} href="/" className="text-white" />
        <div className="auth-pitch">
          <span className="badge badge-mint">{t('auth.asideBadge')}</span>
          <h2>{t('auth.asideTitle')}</h2>
          <p>{t('auth.asideText')}</p>
          <ul>
            {FEATS.map((f) => (
              <li key={f.text}>
                <span>
                  <f.icon aria-hidden />
                </span>
                {t(f.text)}
              </li>
            ))}
          </ul>
        </div>
        <HeroArt kind="catalog" />
      </aside>
      <main className="auth-main">
        <div className="auth-top">
          <Logo text={t('shell.brand')} href="/" className="auth-logo-m" />
        </div>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
