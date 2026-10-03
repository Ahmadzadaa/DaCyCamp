'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const typingTarget = (el: EventTarget | null) => {
  const n = el as HTMLElement | null;
  if (!n) return false;
  return (
    n.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName) ||
    !!n.closest('.monaco-editor, .xterm')
  );
};

/**
 * Geniş axtarış sahəsi: «/» düyməsi ilə fokuslanır, Enter → kataloqda axtarış.
 * Mobil: yalnız ikon; basanda header-in altında tam enli sahə açılır.
 */
export function SearchBox({
  action = '/kurslar',
  placeholder,
}: {
  action?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = path === action ? (sp.get('q') ?? '') : '';
  const [q, setQ] = useState(current);

  useEffect(() => setQ(current), [current]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || typingTarget(e.target)) return;
      e.preventDefault();
      const el = window.matchMedia('(max-width: 900px)').matches ? null : inputRef.current;
      if (el) el.focus();
      else setMobileOpen(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (mobileOpen) mobileRef.current?.focus();
  }, [mobileOpen]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    const params = new URLSearchParams(path === action ? sp.toString() : '');
    if (v) params.set('q', v);
    else params.delete('q');
    const s = params.toString();
    setMobileOpen(false);
    router.push(`${action}${s ? `?${s}` : ''}`);
  }

  const ph = placeholder ?? t('shell.search');
  return (
    <>
      <form className="srch" role="search" onSubmit={submit}>
        <Search aria-hidden className="size-[18px] shrink-0" />
        <input
          ref={inputRef}
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ph}
          aria-label={ph}
          autoComplete="off"
          enterKeyHint="search"
        />
        <kbd title={t('shell.searchShortcut')}>/</kbd>
      </form>
      <button
        type="button"
        className="ib msrch"
        aria-label={t('shell.searchOpen')}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X aria-hidden /> : <Search aria-hidden />}
      </button>
      <form
        className={cn('msrch-panel', mobileOpen && 'open')}
        role="search"
        onSubmit={submit}
        hidden={!mobileOpen}
      >
        <Search aria-hidden className="size-[18px] shrink-0 text-muted" />
        <input
          ref={mobileRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ph}
          aria-label={ph}
          autoComplete="off"
          enterKeyHint="search"
        />
      </form>
    </>
  );
}
