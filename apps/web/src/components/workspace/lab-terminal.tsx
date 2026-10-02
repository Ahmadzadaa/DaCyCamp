'use client';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { LabTicketDto } from '@dacy/shared';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/errors-i18n';
import { labWsUrl } from '@/lib/labs';
import { t } from '@/lib/i18n';

type Msg =
  | { t: 'ready' }
  | { t: 'out'; d: string }
  | { t: 'exit' }
  | { t: 'error'; code?: string; message?: string };

/** xterm.js ↔ API WebSocket ↔ konteyner. Bilet hər qoşulmada yenidən alınır (60 s ömürlü). */
export function LabTerminal({ sessionId, onExit }: { sessionId: string; onExit?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [gen, setGen] = useState(0);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    let ro: ResizeObserver | null = null;
    setState('connecting');
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, ui-monospace, Menlo, monospace',
      fontSize: 13.5,
      lineHeight: 1.25,
      scrollback: 3000,
      allowProposedApi: true,
      theme: {
        background: '#0a1424',
        foreground: '#e6ecf7',
        cursor: '#2bd4a4',
        cursorAccent: '#0a1424',
        selectionBackground: '#2a3f66',
        black: '#0e1b30',
        green: '#2bd4a4',
        blue: '#8fb4ff',
        cyan: '#9ee6cf',
        yellow: '#f2c46d',
        red: '#f79bb5',
        magenta: '#c6a7ff',
        white: '#e6ecf7',
        brightBlack: '#4d5f82',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    const safeFit = () => {
      if (disposed) return;
      try {
        fit.fit();
      } catch {
        /* görünməyən element */
      }
    };

    // open() növbəti tick-də: React StrictMode-un ikiqat mount-unda dərhal dispose olunan terminal
    // xterm-in planlaşdırdığı animation frame-i (viewport sync) icra etməsin
    const timer = setTimeout(() => {
      if (disposed) return;
      term.open(el);
      safeFit();
      ro = new ResizeObserver(safeFit);
      ro.observe(el);
      void (async () => {
        try {
          const ticket = await api<LabTicketDto>(`/learn/labs/${sessionId}/ticket`, {
            method: 'POST',
          });
          if (disposed) return;
          ws = new WebSocket(labWsUrl(ticket, term.cols, term.rows));
          ws.onopen = () => setState('open');
          ws.onmessage = (ev) => {
            let m: Msg;
            try {
              m = JSON.parse(String(ev.data)) as Msg;
            } catch {
              return;
            }
            if (m.t === 'out') term.write(m.d);
            else if (m.t === 'exit') {
              setState('closed');
              exitRef.current?.();
            } else if (m.t === 'error') {
              setState('error');
              term.writeln(`\r\n\x1b[31m${m.message ?? m.code ?? 'error'}\x1b[0m`);
            }
          };
          ws.onclose = () => setState((s) => (s === 'error' ? s : 'closed'));
          ws.onerror = () => setState('error');
          term.onData((d) => {
            if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'in', d }));
          });
          term.onResize(({ cols, rows }) => {
            if (ws?.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ t: 'resize', cols, rows }));
          });
          term.focus();
        } catch (e) {
          if (!disposed) {
            setState('error');
            term.writeln(`\x1b[31m${errorMessage(e)}\x1b[0m`);
          }
        }
      })();
    }, 0);

    return () => {
      disposed = true;
      clearTimeout(timer);
      ro?.disconnect();
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      term.dispose();
    };
  }, [sessionId, gen]);

  return (
    <div className="relative h-full min-h-0 bg-[#0a1424]">
      <div
        ref={host}
        className="h-full w-full px-2 pt-2"
        data-testid="lab-terminal"
        data-state={state}
      />
      {state === 'closed' || state === 'error' ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-navy-line bg-navy/95 px-4 py-2 text-sm text-on-dark-muted">
          <span>{t('ws.labDisconnected')}</span>
          <button type="button" className="b b-run b-sm" onClick={() => setGen((g) => g + 1)}>
            ↻ {t('ws.labReconnect')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
