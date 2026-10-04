'use client';
import { Globe } from 'lucide-react';
import { LOCALE_COOKIE, type Locale } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { getLocale, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LABEL: Record<Locale, string> = { az: 'AZ', en: 'EN' };

/** Seçimi cookie-yə yazır (1 il); daxil olmuş istifadəçidə profilə də (başqa cihazda da keçərli olsun) */
export async function setLocale(locale: Locale, persist: boolean) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  if (persist) {
    try {
      await api('/me', { method: 'PATCH', body: { locale } });
    } catch {
      // profil yazılmasa da cookie kifayətdir
    }
  }
  // hər şey (server komponentləri, client mətnləri, metadata) yeni dildə render olunsun
  window.location.reload();
}

/**
 * Dil düyməsi: digər dilin kodunu göstərir (AZ ⇄ EN). Defolt dil — azərbaycan dili.
 * `persist` — daxil olmuş istifadəçi üçün seçimi profilə də yazır.
 */
export function LanguageSwitcher({
  persist = false,
  className,
}: {
  persist?: boolean;
  className?: string;
}) {
  const current = getLocale();
  const next: Locale = current === 'az' ? 'en' : 'az';
  return (
    <button
      type="button"
      className={cn('b b-ghost b-sm lang-switch', className)}
      onClick={() => setLocale(next, persist)}
      aria-label={`${t('common.languageSwitch')}: ${next === 'en' ? 'English' : 'Azərbaycan dili'}`}
      title={next === 'en' ? 'English' : 'Azərbaycan dili'}
      lang={next}
      data-testid="lang-switch"
    >
      <Globe aria-hidden />
      {LABEL[next]}
    </button>
  );
}

/**
 * Giriş/qeydiyyatdan sonra: bu cihazda dil seçilibsə (cookie) — profilə yazılır;
 * seçilməyibsə profildəki dil cookie-yə köçürülür. true → dil dəyişdi, səhifə tam yüklənməlidir.
 */
export function syncLocaleAfterLogin(saved: Locale | undefined): boolean {
  const m = new RegExp(`(?:^|; )${LOCALE_COOKIE}=(az|en)`).exec(document.cookie);
  const chosen = m?.[1] as Locale | undefined;
  if (chosen) {
    if (chosen !== saved)
      void api('/me', { method: 'PATCH', body: { locale: chosen } }).catch(() => {});
    return false;
  }
  if (saved && saved !== getLocale()) {
    document.cookie = `${LOCALE_COOKIE}=${saved}; path=/; max-age=31536000; samesite=lax`;
    return true;
  }
  return false;
}
