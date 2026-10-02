import type { LabTicketDto } from '@dacy/shared';

/**
 * Terminal WebSocket ünvanı. Next proksisi (/api/*) WebSocket-i ötürmədiyi üçün brauzer birbaşa API-yə qoşulur:
 * NEXT_PUBLIC_LAB_WS_URL verilibsə o, yoxsa eyni host + API portu (defolt 4000).
 */
export function labWsUrl(ticket: LabTicketDto, cols: number, rows: number): string {
  const configured = process.env.NEXT_PUBLIC_LAB_WS_URL;
  const base =
    configured && configured.length
      ? configured
      : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:${process.env.NEXT_PUBLIC_API_PORT ?? '4000'}${ticket.path}`;
  const u = new URL(base);
  u.searchParams.set('ticket', ticket.token);
  u.searchParams.set('cols', String(cols));
  u.searchParams.set('rows', String(rows));
  return u.toString();
}

export const fmtCountdown = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
