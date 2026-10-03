import { Award, Check, CodeXml, Route, SquareTerminal } from 'lucide-react';
import { Logo } from '@/components/app/logo';
import { t } from '@/lib/i18n';

const FEATS = [
  { icon: CodeXml, text: 'auth.feat1', tint: '#12B886' },
  { icon: SquareTerminal, text: 'auth.feat2', tint: '#5E5CE6' },
  { icon: Route, text: 'auth.feat3', tint: '#FF9F0A' },
  { icon: Award, text: 'auth.feat4', tint: '#FF375F' },
] as const;

/**
 * Giriş / qeydiyyat: yumşaq rəngli fon (açıq və tünd rejimdə), solda təqdimat + kod kartı,
 * sağda üzən forma kartı. Mobil — yalnız forma.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-bg" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <aside className="auth-aside">
        <Logo text={t('shell.brand')} href="/" />
        <div className="auth-pitch">
          <span className="badge badge-mint">{t('auth.asideBadge')}</span>
          <h2>{t('auth.asideTitle')}</h2>
          <p>{t('auth.asideText')}</p>
          <ul>
            {FEATS.map((f) => (
              <li key={f.text}>
                <span style={{ ['--ic' as string]: f.tint }}>
                  <f.icon aria-hidden />
                </span>
                {t(f.text)}
              </li>
            ))}
          </ul>
        </div>
        {/* platformadan kiçik nümunə: kod + keçən testlər */}
        <div className="auth-preview" aria-hidden>
          <div className="ap-head">
            <i />
            <i />
            <i />
            <span>analiz.py</span>
          </div>
          <pre>
            <code>
              <span className="k">import</span> pandas <span className="k">as</span> pd{'\n'}
              df = pd.<span className="f">read_csv</span>(
              <span className="s">&quot;satislar.csv&quot;</span>){'\n'}
              <span className="c"># şəhərlər üzrə ümumi satış</span>
              {'\n'}
              df.<span className="f">groupby</span>(<span className="s">&quot;seher&quot;</span>)[
              <span className="s">&quot;mebleg&quot;</span>].<span className="f">sum</span>()
            </code>
          </pre>
          <div className="ap-ok">
            <Check aria-hidden />
            {t('ws.testsPassed')}
            <b>{t('common.plusXp', { n: 50 })}</b>
          </div>
        </div>
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
