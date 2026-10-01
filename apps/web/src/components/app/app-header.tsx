import Link from 'next/link';
import type { PublicUser } from '@dacy/shared';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { HeaderNav } from './header-nav';
import { t } from '@/lib/i18n';

export function AppHeader({ user, q }: { user: PublicUser | null; q?: string }) {
  return (
    <header className="apph">
      <Logo />
      <HeaderNav />
      <div className="flex-1" />
      <form action="/kurslar" className="hidden md:block">
        <input
          name="q"
          defaultValue={q}
          className="search"
          placeholder={t('nav.search')}
          aria-label={t('nav.search')}
        />
      </form>
      <ThemeToggle />
      {user ? (
        <UserMenu user={user} />
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/giris" className="text-sm text-on-dark-muted hover:text-on-dark">
            {t('nav.login')}
          </Link>
          <Link href="/qeydiyyat" className="b b-brand b-sm">
            {t('nav.register')}
          </Link>
        </div>
      )}
    </header>
  );
}
