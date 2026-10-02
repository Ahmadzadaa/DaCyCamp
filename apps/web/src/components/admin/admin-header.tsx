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
      <Link href="/admin/idxal" className="b b-brand b-sm">
        ⇪ {t('nav.import')}
      </Link>
      <Link href="/kurslar" className="text-sm text-on-dark-muted hover:text-on-dark">
        {t('nav.backToSite')}
      </Link>
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
