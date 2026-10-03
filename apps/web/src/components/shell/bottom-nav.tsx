'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MoreHorizontal, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { BOTTOM_NAV, STUDENT_NAV, isActive } from './nav-config';

/** Mobil (<900px): alt naviqasiya + «Daha çox» vərəqi (bütün sidebar elementləri) */
export function BottomNav({ footer, authed }: { footer?: React.ReactNode; authed: boolean }) {
  const sections = STUDENT_NAV;
  const path = usePathname();
  const search = useSearchParams().toString();
  const main = BOTTOM_NAV.filter((it) => authed || !it.auth);
  const inMain = main.some((it) => isActive(it, path, search));
  return (
    <nav className="bnav" aria-label={t('shell.bottomNav')}>
      {main.map((it) => {
        const Icon = it.icon;
        const on = isActive(it, path, search);
        return (
          <Link key={it.href} href={it.href} aria-current={on ? 'page' : undefined}>
            <Icon aria-hidden />
            {t(it.label)}
          </Link>
        );
      })}
      <DialogPrimitive.Root>
        <DialogPrimitive.Trigger aria-current={!inMain ? 'page' : undefined}>
          <MoreHorizontal aria-hidden />
          {t('shell.more')}
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="sheet-ov" />
          <DialogPrimitive.Content className="sheet">
            <div className="sheet-h">
              <DialogPrimitive.Title className="text-base font-bold text-white">
                {t('shell.menu')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="ib on-dark" aria-label={t('common.close')}>
                <X aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              {t('shell.sideNav')}
            </DialogPrimitive.Description>
            <div className="sb sb-sheet">
              {sections.map((sec, i) => (
                <div key={sec.title ?? i} className="sb-group">
                  {sec.title ? <div className="sb-sec">{t(sec.title)}</div> : null}
                  {sec.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <DialogPrimitive.Close asChild key={it.href}>
                        <Link
                          href={it.href}
                          aria-current={isActive(it, path, search) ? 'page' : undefined}
                        >
                          <Icon aria-hidden />
                          <span className="sb-lbl">{t(it.label)}</span>
                          {it.isNew ? <span className="new">{t('shell.newBadge')}</span> : null}
                        </Link>
                      </DialogPrimitive.Close>
                    );
                  })}
                </div>
              ))}
              {footer ? <div className="sb-foot">{footer}</div> : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </nav>
  );
}
