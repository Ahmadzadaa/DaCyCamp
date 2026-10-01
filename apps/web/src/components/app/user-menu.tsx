'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, User } from 'lucide-react';
import type { PublicUser } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { t } from '@/lib/i18n';
import { initials } from '@/lib/utils';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown';

export function UserMenu({ user }: { user: PublicUser }) {
  const router = useRouter();
  const staff = user.role === 'ADMIN' || user.role === 'INSTRUCTOR';
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/giris');
    router.refresh();
  }
  return (
    <Dropdown>
      <DropdownTrigger className="avatar cursor-pointer" aria-label={user.name} title={user.name}>
        {initials(user.name)}
      </DropdownTrigger>
      <DropdownContent>
        <div className="px-3 py-2 text-xs text-muted">
          <div className="font-semibold text-ink">{user.name}</div>
          <div>{user.email}</div>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/profil">
            <User className="size-4" />
            {t('nav.profile')}
          </Link>
        </DropdownItem>
        {staff ? (
          <DropdownItem asChild>
            <Link href="/admin/kurslar">
              <Settings className="size-4" />
              {t('nav.admin')}
            </Link>
          </DropdownItem>
        ) : null}
        <DropdownSeparator />
        <DropdownItem onSelect={logout}>
          <LogOut className="size-4" />
          {t('nav.logout')}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
