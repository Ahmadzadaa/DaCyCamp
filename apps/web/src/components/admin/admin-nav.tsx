'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';

const NAV = [
  { href: '/admin/kurslar', match: /^\/admin\/kurslar/, label: () => t('nav.courses') },
  { href: '/admin/istiqametler', match: /^\/admin\/istiqametler/, label: () => t('nav.tracks') },
  { href: '/admin/telebeler', match: /^\/admin\/telebeler/, label: () => t('nav.students') },
  { href: '/admin/fayllar', match: /^\/admin\/fayllar/, label: () => t('nav.files') },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin naviqasiyası" className="flex-wrap">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={n.match.test(path) ? 'page' : undefined}>
          {n.label()}
        </Link>
      ))}
    </nav>
  );
}
