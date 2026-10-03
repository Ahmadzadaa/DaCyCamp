'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { ADMIN_NAV, STUDENT_NAV, isActive, visibleSections } from './nav-config';

/**
 * Sol navy sidebar (260px). Aktiv element: navy-3 fon, ağ qalın yazı, mint ikon və sol mint zolaq.
 * `footer` — aşağıda yapışan blok (tələbə: «Həftəlik hədəf», admin: istifadəçi).
 */
export function Sidebar({
  nav,
  footer,
  isAdmin = true,
  staff = false,
  counts,
  label,
}: {
  /** ikon komponentləri serverdən ötürülə bilmədiyi üçün konfiq açarla seçilir */
  nav: 'student' | 'admin';
  footer?: React.ReactNode;
  isAdmin?: boolean;
  /** tələbə qabığında «Admin panel» keçidi */
  staff?: boolean;
  counts?: Partial<Record<'reviews' | 'support', number>>;
  label?: string;
}) {
  const path = usePathname();
  const search = useSearchParams().toString();
  const sections = visibleSections(nav === 'admin' ? ADMIN_NAV : STUDENT_NAV, { staff, isAdmin });
  return (
    <aside className="sb" aria-label={label ?? t('shell.sideNav')}>
      <nav className="sb-nav">
        {sections.map((sec, i) => {
          const items = sec.items;
          return (
            <div key={sec.title ?? i} className="sb-group">
              {sec.title ? <div className="sb-sec">{t(sec.title)}</div> : null}
              {items.map((it) => {
                const Icon = it.icon;
                const on = isActive(it, path, search);
                const count = it.countKey ? counts?.[it.countKey] : undefined;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={on ? 'page' : undefined}
                    style={it.tint ? { ['--ic' as string]: it.tint } : undefined}
                  >
                    <Icon aria-hidden />
                    <span className="sb-lbl">{t(it.label)}</span>
                    {it.isNew ? <span className="new">{t('shell.newBadge')}</span> : null}
                    {count ? <span className="new">{count}</span> : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      {footer ? <div className="sb-foot">{footer}</div> : null}
    </aside>
  );
}
