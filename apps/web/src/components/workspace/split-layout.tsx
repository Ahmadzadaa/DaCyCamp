'use client';
import { t } from '@/lib/i18n';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Group,
  Panel,
  Separator,
  type GroupImperativeHandle,
  type Layout,
} from 'react-resizable-panels';

const KEY = 'dacy:ws-layout';

/**
 * Solda təlimat, sağda redaktor; ortadakı xətt sürüklənir. <900px: «Tapşırıq / Kod» tabları (UX-01) — hər iki panel
 * montajda qalır (yalnız gizlədilir), ona görə yazılmış kod, redaktor vəziyyəti və nəticələr tab dəyişəndə itmir.
 */
export function SplitLayout({
  left,
  right,
  rightLabel = t('ws.codeTab'),
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  /** mobil tabın adı: Kod / Terminal / Flag */
  rightLabel?: string;
}) {
  const [vertical, setVertical] = useState(false);
  const [pane, setPane] = useState<'task' | 'code'>('task');
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => setVertical(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (vertical) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && groupRef.current) groupRef.current.setLayout(JSON.parse(raw) as Layout);
    } catch {
      /* ignore */
    }
  }, [vertical]);

  if (vertical) {
    const tabs = [
      { id: 'task' as const, label: t('ws.task') },
      { id: 'code' as const, label: rightLabel },
    ];
    // WAI-ARIA tabs: ← / → digər taba keçir və fokuslayır
    const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = pane === 'task' ? 'code' : 'task';
      setPane(next);
      document.getElementById(`ws-tab-${next}`)?.focus();
    };
    return (
      <div className="ws-mobile">
        <div className="ws-tabs" role="tablist" aria-label={t('ws.paneTabs')} onKeyDown={onKey}>
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`ws-tab-${x.id}`}
              aria-controls={`ws-pane-${x.id}`}
              aria-selected={pane === x.id}
              tabIndex={pane === x.id ? 0 : -1}
              onClick={() => setPane(x.id)}
              data-testid={`ws-tab-${x.id}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        {/* server komponentindən gələn elementlər — açarsız React xəbərdarlıq verir */}
        <div
          id="ws-pane-task"
          role="tabpanel"
          aria-labelledby="ws-tab-task"
          className="ws-pane"
          hidden={pane !== 'task'}
        >
          <Fragment key="left">{left}</Fragment>
        </div>
        <div
          id="ws-pane-code"
          role="tabpanel"
          aria-labelledby="ws-tab-code"
          className="ws-pane"
          hidden={pane !== 'code'}
        >
          <Fragment key="right">{right}</Fragment>
        </div>
      </div>
    );
  }

  const save = (layout: Layout) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  };

  return (
    <Group
      orientation="horizontal"
      groupRef={groupRef}
      onLayoutChanged={save}
      className="min-h-0 flex-1"
    >
      <Panel id="left" defaultSize="40%" minSize={300} className="min-h-0 min-w-0">
        {left}
      </Panel>
      <Separator className="gutter" aria-label={t('ws.resizePanels')} />
      <Panel id="right" minSize={360} className="min-h-0 min-w-0">
        {right}
      </Panel>
    </Group>
  );
}
