'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useAdmin } from './admin-context';

const NAV = [
  { href: '/admin/kurslar', match: /^\/admin\/kurslar/, label: () => t('nav.courses') },
  { href: '/admin/istiqametler', match: /^\/admin\/istiqametler/, label: () => t('nav.tracks') },
  { href: '/admin/telebeler', match: /^\/admin\/telebeler/, label: () => t('nav.students') },
  { href: '/admin/fayllar', match: /^\/admin\/fayllar/, label: () => t('nav.files') },
  { href: '/admin/lablar', match: /^\/admin\/lablar/, label: () => t('nav.labs') },
  { href: '/admin/yollar', match: /^\/admin\/yollar/, label: () => t('nav.paths') },
  { href: '/admin/layiheler', match: /^\/admin\/layiheler/, label: () => t('nav.reviews') },
  {
    href: '/admin/tarixce',
    match: /^\/admin\/tarixce/,
    label: () => t('audit.title'),
    adminOnly: true,
  },
];

export function AdminNav() {
  const path = usePathname();
  const sp = useSearchParams();
  const { isAdmin } = useAdmin();
  const trash = path === '/admin/kurslar' && sp.get('status') === 'deleted';
  return (
    <nav aria-label="Admin naviqasiyası" className="flex-wrap">
      {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={n.match.test(path) && !trash ? 'page' : undefined}
        >
          {n.label()}
        </Link>
      ))}
      {isAdmin ? (
        <Link href="/admin/kurslar?status=deleted" aria-current={trash ? 'page' : undefined}>
          {t('courseAdmin.trash')}
        </Link>
      ) : null}
    </nav>
  );
}
