import { Suspense } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { MeSummaryDto, PublicUser } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { Logo } from '@/components/app/logo';
import { UserMenu } from '@/components/app/user-menu';
import { Sidebar } from './sidebar';
import { PillNav } from './pill-nav';
import { SearchBox } from './search-box';
import { NotificationsBell } from './notifications';
import { HelpButton } from './help-button';
import { BottomNav } from './bottom-nav';
import { GuestCta, WeeklyGoal } from './weekly-goal';

/**
 * Tələbə qabığı (dizayn v2): ağ header (loqo · pill menyu · axtarış · zəng · avatar),
 * solda 260px navy sidebar, sağ aşağıda kömək düyməsi, mobil — alt naviqasiya.
 */
export function AppShell({
  user,
  summary,
  children,
}: {
  user: PublicUser | null;
  summary: MeSummaryDto | null;
  children: React.ReactNode;
}) {
  const footer = user ? summary ? <WeeklyGoal summary={summary} /> : null : <GuestCta />;
  const staff = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';
  return (
    <div className="app">
      <a href="#main" className="skip">
        Məzmuna keç
      </a>
      <header className="top">
        <div className="top-brand">
          <Logo text={t('shell.brand')} href={user ? '/panel' : '/'} />
        </div>
        <PillNav authed={!!user} />
        <Suspense fallback={<div className="srch" />}>
          <SearchBox />
        </Suspense>
        <div className="top-actions">
          {user ? (
            <>
              {staff ? (
                <Link href="/admin" className="b b-navy b-sm max-md:hidden" data-testid="go-admin">
                  <ShieldCheck aria-hidden />
                  {t('shell.adminPanel')}
                </Link>
              ) : null}
              <NotificationsBell unread={summary?.unreadNotifications ?? 0} />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/giris" className="b b-ghost b-sm">
                {t('nav.login')}
              </Link>
              <Link href="/qeydiyyat" className="b b-brand b-sm max-sm:hidden">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </header>
      <div className="shell">
        <Suspense fallback={<aside className="sb" />}>
          <Sidebar nav="student" footer={footer} staff={staff} />
        </Suspense>
        <main className="content" id="main">
          <div className="content-in">{children}</div>
        </main>
      </div>
      <HelpButton />
      <Suspense fallback={null}>
        <BottomNav footer={footer} authed={!!user} staff={staff} />
      </Suspense>
    </div>
  );
}
