'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { TKey } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface SubNavItem {
  href: string;
  label: TKey;
  /** dəqiq uyğunluq (ümumi baxış kimi kök səhifələr üçün) */
  exact?: boolean;
  /** ?query ilə seçilən tab (məs. ?tab=students) */
  query?: [string, string];
}

/** Bölmə daxili naviqasiya (admin-tabs üslubu); aktiv element yola / sorğuya görə */
export function SubNav({ items, label }: { items: SubNavItem[]; label: string }) {
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <nav className="admin-tabs" aria-label={label}>
      {items.map((it) => {
        const base = it.href.split('?')[0]!;
        const on = it.query
          ? path === base && (sp.get(it.query[0]) ?? '') === it.query[1]
          : it.exact
            ? path === base
            : path === base || path.startsWith(`${base}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(on && 'on')}
            aria-current={on ? 'page' : undefined}
          >
            {t(it.label)}
          </Link>
        );
      })}
    </nav>
  );
}
