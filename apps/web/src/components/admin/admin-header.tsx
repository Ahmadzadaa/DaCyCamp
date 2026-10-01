import Link from 'next/link';
import type { PublicUser } from '@dacy/shared';
import { Logo } from '@/components/app/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { UserMenu } from '@/components/app/user-menu';
import { t } from '@/lib/i18n';
import { AdminNav } from './admin-nav';

export function AdminHeader({ user }: { user: PublicUser }) {
  return (
    <header className="apph flex-wrap gap-y-2">
      <Logo text={t('app.admin')} href="/admin/kurslar" />
      <AdminNav />
      <div className="flex-1" />
      <span title={t('admin.phase', { n: 2 })} className="inline-flex">
        <button type="button" className="b b-brand b-sm" disabled aria-describedby="zip-soon">
          ⇪ {t('nav.import')}
        </button>
        <span id="zip-soon" className="sr-only">
          {t('admin.importSoon')}
        </span>
      </span>
      <Link href="/kurslar" className="text-sm text-on-dark-muted hover:text-on-dark">
        {t('nav.backToSite')}
      </Link>
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
