'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Award, Check, Home, LogOut, Monitor, Moon, Settings, Sun, User } from 'lucide-react';
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

const THEMES = [
  { value: 'light', label: 'shell.themeLight', icon: Sun },
  { value: 'dark', label: 'shell.themeDark', icon: Moon },
  { value: 'system', label: 'shell.themeSystem', icon: Monitor },
] as const;

/** Avatar menyusu: profil, sertifikatlar, admin/sayt keçidi, görünüş (açıq/tünd/sistem), çıxış */
export function UserMenu({ user, area = 'app' }: { user: PublicUser; area?: 'app' | 'admin' }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const staff = user.role === 'ADMIN' || user.role === 'INSTRUCTOR';
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/giris');
    router.refresh();
  }
  return (
    <Dropdown>
      <DropdownTrigger
        className="avatar cursor-pointer"
        aria-label={user.name}
        title={user.name}
        data-testid="user-menu"
      >
        {initials(user.name)}
      </DropdownTrigger>
      <DropdownContent className="min-w-60">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <span className="avatar">{initials(user.name)}</span>
          <div className="min-w-0 text-xs text-muted">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </div>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/profil">
            <User className="size-4" />
            {t('nav.profile')}
          </Link>
        </DropdownItem>
        {area === 'app' ? (
          <DropdownItem asChild>
            <Link href="/sertifikatlar">
              <Award className="size-4" />
              {t('nav.certificates')}
            </Link>
          </DropdownItem>
        ) : null}
        {staff && area === 'app' ? (
          <DropdownItem asChild>
            <Link href="/admin">
              <Settings className="size-4" />
              {t('shell.adminPanel')}
            </Link>
          </DropdownItem>
        ) : null}
        {area === 'admin' ? (
          <DropdownItem asChild>
            <Link href="/kurslar">
              <Home className="size-4" />
              {t('shell.goToSite')}
            </Link>
          </DropdownItem>
        ) : null}
        <DropdownSeparator />
        <Menu.Label className="menu-label">{t('shell.themeTitle')}</Menu.Label>
        <Menu.RadioGroup value={mounted ? (theme ?? 'system') : 'system'} onValueChange={setTheme}>
          {THEMES.map((th) => (
            <Menu.RadioItem key={th.value} value={th.value} className="menu-item">
              <th.icon className="size-4" />
              {t(th.label)}
              <Menu.ItemIndicator className="ml-auto">
                <Check className="size-4 text-brand" />
              </Menu.ItemIndicator>
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
        <DropdownSeparator />
        <DropdownItem onSelect={logout}>
          <LogOut className="size-4" />
          {t('nav.logout')}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
