'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { PILL_NAV } from './nav-config';

/** Header-dəki bölmə menyusu: Öyrən · Tətbiq et · Sertifikatlar (aktiv — ağ «tablet») */
export function PillNav({ authed }: { authed: boolean }) {
  const path = usePathname();
  const active = PILL_NAV.find((p) => p.match.some((r) => r.test(path)))?.key;
  return (
    <nav className="pill" aria-label={t('shell.mainNav')}>
      {PILL_NAV.map((p) => {
        const Icon = p.icon;
        return (
          <Link
            key={p.key}
            href={p.href(authed)}
            aria-current={active === p.key ? 'page' : undefined}
          >
            <Icon aria-hidden />
            {t(p.label)}
          </Link>
        );
      })}
    </nav>
  );
}
