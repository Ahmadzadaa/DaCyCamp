'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Group,
  Panel,
  Separator,
  type GroupImperativeHandle,
  type Layout,
} from 'react-resizable-panels';

const KEY = 'dacy:ws-layout';

/** Solda təlimat, sağda redaktor; ortadakı xətt sürüklənir. <900px: üst-üstə (əvvəl təlimat), sürüşdürmə ilə. */
export function SplitLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [vertical, setVertical] = useState(false);
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
    return (
      <div className="ws-stack">
        {left}
        <div className="h-1.5 shrink-0 bg-navy-line" aria-hidden />
        {right}
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
      <Separator className="gutter" aria-label="Panellərin enini dəyişin" />
      <Panel id="right" minSize={360} className="min-h-0 min-w-0">
        {right}
      </Panel>
    </Group>
  );
}
