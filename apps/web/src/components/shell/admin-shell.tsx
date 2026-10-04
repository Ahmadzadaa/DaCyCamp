import { Suspense } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import type { MeSummaryDto, PublicUser } from '@dacy/shared';
import { t } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { initials } from '@/lib/utils';
import { Logo } from '@/components/app/logo';
import { UserMenu } from '@/components/app/user-menu';
import { Sidebar } from './sidebar';
import { SearchBox } from './search-box';
import { NotificationsBell } from './notifications';
import { HelpButton } from './help-button';

/**
 * Admin qabığı (skrinşot): ağ header (DaCy Admin · axtarış · «Sayta keç» · zəng · avatar),
 * solda navy sidebar — Ümumi baxış · KONTENT · İNSANLAR · SİSTEM.
 */
export function AdminShell({
  user,
  summary,
  children,
}: {
  user: PublicUser;
  summary: MeSummaryDto | null;
  children: React.ReactNode;
}) {
  const isAdmin = user.role === 'ADMIN';
  return (
    <div className="app admin">
      <a href="#main" className="skip">
        {t('common.skipToContent')}
      </a>
      <header className="top">
        <div className="top-brand">
          <Logo text={t('shell.brandAdmin')} href="/admin" />
        </div>
        <Suspense fallback={<div className="srch admin-srch" />}>
          <SearchBox action="/admin/axtar" placeholder={t('shell.adminSearch')} />
        </Suspense>
        <div className="top-actions">
          <LanguageSwitcher persist />
          <Link href="/kurslar" className="b b-ghost b-sm max-md:hidden">
            <Home aria-hidden />
            {t('shell.goToSite')}
          </Link>
          <NotificationsBell unread={summary?.unreadNotifications ?? 0} />
          <UserMenu user={user} area="admin" />
        </div>
      </header>
      <div className="shell">
        <Suspense fallback={<aside className="sb" />}>
          <Sidebar
            nav="admin"
            isAdmin={isAdmin}
            counts={{ reviews: summary?.pendingReviews ?? 0, support: summary?.openSupport ?? 0 }}
            label="Admin menyu"
            footer={
              <div className="sb-user">
                <span className="avatar sm" style={{ background: 'var(--navy-3)' }}>
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <b className="truncate">{user.name}</b>
                  <span className="block truncate">{user.email}</span>
                </div>
              </div>
            }
          />
        </Suspense>
        <main className="content" id="main">
          <div className="content-in wide">{children}</div>
        </main>
      </div>
      <HelpButton />
    </div>
  );
}
