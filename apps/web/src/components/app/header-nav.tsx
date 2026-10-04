'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';

const NAV = [
  { href: '/kurslar', match: [/^\/kurslar/, /^\/kurs\//], label: () => t('nav.courses') },
  { href: '/yollar', match: [/^\/yollar/, /^\/yol\//], label: () => t('nav.paths') },
  { href: '/panel', match: [/^\/panel/], label: () => t('nav.dashboard') },
  { href: '/sertifikatlar', match: [/^\/sertifikat/], label: () => t('nav.certificates') },
];

export function HeaderNav() {
  const path = usePathname();
  return (
    <nav className="hidden md:flex" aria-label={t('shell.mainNav')}>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={n.match.some((r) => r.test(path)) ? 'page' : undefined}
        >
          {n.label()}
        </Link>
      ))}
    </nav>
  );
}
