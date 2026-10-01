'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { t } from '@/lib/i18n';

const ORDER = ['light', 'dark', 'system'] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cur = (mounted ? theme : 'system') as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]!;
  const Icon = cur === 'light' ? Sun : cur === 'dark' ? Moon : Monitor;
  const label =
    cur === 'light'
      ? t('common.themeLight')
      : cur === 'dark'
        ? t('common.themeDark')
        : t('common.themeSystem');
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={className ?? 'rounded-md p-1.5 text-on-dark-muted hover:text-on-dark'}
      title={`${t('common.theme')}: ${label}`}
      aria-label={`${t('common.theme')}: ${label}`}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
