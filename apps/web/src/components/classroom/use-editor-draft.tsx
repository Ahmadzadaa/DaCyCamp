'use client';
import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

type Saved<T> = { data: T; version: number | string | undefined };
export function useEditorDraft<T>(key: string, open: boolean, data: T, version?: number | string) {
  const base = useRef(version);
  const [stale, setStale] = useState<Saved<T> | null>(null);
  const [available, setAvailable] = useState(true);
  const [recovered, setRecovered] = useState(false);
  const json = JSON.stringify(data);
  useEffect(() => {
    if (!open || stale) return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ data: JSON.parse(json), version: base.current }),
      );
    } catch {
      setAvailable(false);
    }
  }, [key, open, json, stale]);
  return {
    stale,
    available,
    recovered,
    get baseVersion() {
      return base.current;
    },
    begin(defaults: T) {
      base.current = version;
      setStale(null);
      setRecovered(false);
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw) as Saved<T>;
          if (saved && typeof saved.data === 'object' && saved.data !== null) {
            if (saved.version === version) {
              setRecovered(true);
              return saved.data;
            }
            setStale(saved);
          }
        }
      } catch {
        /* an invalid browser draft must never prevent editing */
      }
      return defaults;
    },
    recover() {
      const value = stale?.data;
      setStale(null);
      setRecovered(true);
      return value;
    },
    clear() {
      try {
        window.localStorage.removeItem(key);
      } catch {}
      setStale(null);
      setRecovered(false);
    },
  };
}

export function DraftStatus({
  draft,
  onRestore,
}: {
  draft: { stale: unknown; available: boolean; recovered: boolean; clear: () => void };
  onRestore: () => void;
}) {
  return (
    <div className="rounded-xl bg-soft px-3 py-2 text-xs text-muted" role="status">
      {draft.stale ? (
        <>
          <p>{t('reliability.draftStale')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRestore}>
              {t('reliability.draftRestore')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={draft.clear}>
              {t('reliability.draftDiscard')}
            </Button>
          </div>
        </>
      ) : (
        t(
          draft.available
            ? draft.recovered
              ? 'reliability.draftRecovered'
              : 'reliability.draftSaved'
            : 'reliability.draftUnavailable',
        )
      )}
    </div>
  );
}
